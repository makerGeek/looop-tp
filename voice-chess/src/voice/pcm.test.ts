import { PcmAccumulator, PcmRing, SILENCE_DBFS, asInt16, encodeWav, rmsDbfs, toMono } from './pcm';

/** A sine wave at a given amplitude (0–1), for predictable RMS. */
function tone(samples: number, amplitude: number, cyclesPerBuffer = 8): Int16Array {
  const out = new Int16Array(samples);
  for (let i = 0; i < samples; i += 1) {
    out[i] = Math.round(Math.sin((i / samples) * cyclesPerBuffer * 2 * Math.PI) * amplitude * 32767);
  }
  return out;
}

describe('rmsDbfs', () => {
  it('reports digital silence for an empty or zeroed buffer', () => {
    expect(rmsDbfs(new Int16Array(0))).toBe(SILENCE_DBFS);
    expect(rmsDbfs(new Int16Array(256))).toBe(SILENCE_DBFS);
  });

  it('puts a full-scale sine just under 0 dBFS', () => {
    // A sine's RMS is its peak over root two — about -3 dBFS at full scale.
    expect(rmsDbfs(tone(1024, 1))).toBeCloseTo(-3.01, 1);
  });

  it('falls by 6 dB when the amplitude halves', () => {
    const loud = rmsDbfs(tone(1024, 0.5));
    const quiet = rmsDbfs(tone(1024, 0.25));
    expect(loud - quiet).toBeCloseTo(6, 0);
  });

  it('does not overflow on a buffer of full-scale samples', () => {
    // Squaring int16 in a 32-bit accumulator wraps; this is the regression.
    const full = new Int16Array(4096).fill(32767);
    const level = rmsDbfs(full);
    expect(Number.isFinite(level)).toBe(true);
    expect(level).toBeCloseTo(0, 1);
  });

  it('is steadier than a peak reading across a spiky buffer', () => {
    // One click in an otherwise quiet buffer. `getMaxAmplitude()` would call
    // this full scale — 0 dBFS, indistinguishable from a shout. RMS puts it
    // 30 dB lower, which is why the gate no longer opens on a chair.
    const clicky = new Int16Array(1024);
    clicky[500] = 32767;
    const peakWouldSay = 0;
    expect(rmsDbfs(clicky)).toBeLessThan(peakWouldSay - 25);

    // And a real syllable at a *tenth* of that peak still reads louder.
    expect(rmsDbfs(tone(1024, 0.1))).toBeGreaterThan(rmsDbfs(clicky));
  });
});

describe('PcmRing', () => {
  it('keeps only the most recent samples', () => {
    const ring = new PcmRing(4);
    ring.push(Int16Array.from([1, 2, 3]));
    ring.push(Int16Array.from([4, 5]));
    expect(Array.from(ring.drain())).toEqual([2, 3, 4, 5]);
  });

  it('handles a chunk that wraps the end of the buffer', () => {
    const ring = new PcmRing(5);
    ring.push(Int16Array.from([1, 2, 3, 4]));
    ring.push(Int16Array.from([5, 6, 7]));
    expect(Array.from(ring.drain())).toEqual([3, 4, 5, 6, 7]);
  });

  it('handles a chunk larger than itself', () => {
    const ring = new PcmRing(3);
    ring.push(Int16Array.from([1, 2, 3, 4, 5]));
    expect(Array.from(ring.drain())).toEqual([3, 4, 5]);
  });

  it('reports a partial fill before it has wrapped', () => {
    const ring = new PcmRing(8);
    ring.push(Int16Array.from([1, 2]));
    expect(ring.length).toBe(2);
    expect(Array.from(ring.drain())).toEqual([1, 2]);
  });

  it('empties on clear', () => {
    const ring = new PcmRing(4);
    ring.push(Int16Array.from([1, 2, 3]));
    ring.clear();
    expect(ring.length).toBe(0);
    expect(Array.from(ring.drain())).toEqual([]);
  });
});

describe('PcmAccumulator', () => {
  it('joins chunks in order', () => {
    const acc = new PcmAccumulator(100);
    acc.push(Int16Array.from([1, 2]));
    acc.push(Int16Array.from([3]));
    expect(Array.from(acc.take())).toEqual([1, 2, 3]);
  });

  it('empties itself when taken', () => {
    const acc = new PcmAccumulator(100);
    acc.push(Int16Array.from([1, 2]));
    acc.take();
    expect(acc.length).toBe(0);
    expect(Array.from(acc.take())).toEqual([]);
  });

  it('stops growing at its ceiling, so a stuck gate cannot exhaust memory', () => {
    const acc = new PcmAccumulator(4);
    acc.push(Int16Array.from([1, 2, 3]));
    acc.push(Int16Array.from([4, 5, 6]));
    acc.push(Int16Array.from([7, 8, 9]));
    expect(Array.from(acc.take())).toEqual([1, 2, 3, 4]);
  });
});

describe('encodeWav', () => {
  const samples = Int16Array.from([0, 1000, -1000, 32767, -32768]);
  const wav = encodeWav(samples, 16000);
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  const text = (offset: number, length: number) =>
    String.fromCharCode(...Array.from(wav.subarray(offset, offset + length)));

  it('writes a RIFF/WAVE container', () => {
    expect(text(0, 4)).toBe('RIFF');
    expect(text(8, 4)).toBe('WAVE');
    expect(text(12, 4)).toBe('fmt ');
    expect(text(36, 4)).toBe('data');
  });

  it('declares 16-bit mono PCM at the given rate', () => {
    expect(view.getUint16(20, true)).toBe(1); // uncompressed
    expect(view.getUint16(22, true)).toBe(1); // mono
    expect(view.getUint32(24, true)).toBe(16000);
    expect(view.getUint32(28, true)).toBe(32000); // byte rate
    expect(view.getUint16(32, true)).toBe(2); // block align
    expect(view.getUint16(34, true)).toBe(16);
  });

  it('declares sizes that match the payload', () => {
    expect(wav.byteLength).toBe(44 + samples.length * 2);
    expect(view.getUint32(4, true)).toBe(wav.byteLength - 8);
    expect(view.getUint32(40, true)).toBe(samples.length * 2);
  });

  it('round-trips the samples, extremes included', () => {
    const decoded = new Int16Array(wav.buffer, wav.byteOffset + 44, samples.length);
    expect(Array.from(decoded)).toEqual(Array.from(samples));
  });

  it('writes little-endian samples, whatever the host', () => {
    // 1000 is 0x03E8, so the low byte must come first on disk.
    expect(wav[44 + 2]).toBe(0xe8);
    expect(wav[44 + 3]).toBe(0x03);
  });
});

describe('asInt16', () => {
  it('ignores a trailing odd byte rather than throwing', () => {
    const odd = new ArrayBuffer(5);
    expect(asInt16(odd).length).toBe(2);
  });
});

describe('toMono', () => {
  it('passes mono through untouched', () => {
    const mono = Int16Array.from([1, 2, 3]);
    expect(toMono(mono, 1)).toBe(mono);
  });

  it('averages interleaved stereo frames', () => {
    expect(Array.from(toMono(Int16Array.from([100, 200, -100, -200]), 2))).toEqual([150, -150]);
  });
});

