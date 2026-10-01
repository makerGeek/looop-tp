/**
 * Raw audio: levels, buffering, and WAV encoding.
 *
 * The app used to capture through `MediaRecorder` and read its level with
 * `getMaxAmplitude()`. Three things were wrong with that, and together they are
 * why both halves of the voice loop felt broken:
 *
 * 1. **`getMaxAmplitude()` is a destructive read** — it returns the peak *since
 *    the last call*. Two things were calling it: the detector's sampler and the
 *    hook that drives the level ring. Each call reset the other's window, so
 *    both saw a random subset of the peaks and both under-read.
 * 2. **It is a peak, not an average.** A single click reads the same as a
 *    syllable, which is a poor signal to threshold against.
 * 3. **The clip began when the microphone opened**, so a sentence spoken after
 *    twenty seconds of quiet was uploaded as twenty seconds of silence with
 *    some speech at the end — reliably the worst case for a transcription
 *    model, which fills silence with invented text.
 *
 * Capturing PCM directly fixes all three: one reading of the real samples, an
 * honest RMS, and a ring buffer that lets a clip *start before the speech did*.
 *
 * Everything here is pure and synchronous, so it is tested rather than guessed.
 */

/** Digital silence. Matches what the platforms report for an empty buffer. */
export const SILENCE_DBFS = -160;

/**
 * Root-mean-square level of a buffer, in dBFS (decibels relative to full
 * scale, so always ≤ 0).
 *
 * RMS rather than peak because it tracks *perceived loudness* — which is what
 * separates speech from a room — and because it is far steadier between
 * buffers, so the detector is thresholding a signal rather than a spike train.
 */
export function rmsDbfs(samples: Int16Array): number {
  if (samples.length === 0) return SILENCE_DBFS;

  // Accumulate in a float: squaring int16 overflows 32-bit integers.
  let sumOfSquares = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const sample = samples[i] / 32768;
    sumOfSquares += sample * sample;
  }

  const rms = Math.sqrt(sumOfSquares / samples.length);
  if (rms <= 0) return SILENCE_DBFS;
  return Math.max(SILENCE_DBFS, 20 * Math.log10(rms));
}

/**
 * A fixed-capacity ring of PCM samples.
 *
 * This is what makes the pre-roll possible. The detector cannot know speech has
 * started until it has already heard some, so a clip that begins at that moment
 * is missing its own first syllable — "e4" becomes "four". Keeping the last
 * fraction of a second on hand means the clip can start slightly in the past.
 */
export class PcmRing {
  private readonly buffer: Int16Array;
  private writeIndex = 0;
  private filled = 0;

  constructor(readonly capacity: number) {
    this.buffer = new Int16Array(capacity);
  }

  push(samples: Int16Array): void {
    // A chunk at least as large as the ring simply replaces it.
    if (samples.length >= this.capacity) {
      this.buffer.set(samples.subarray(samples.length - this.capacity));
      this.writeIndex = 0;
      this.filled = this.capacity;
      return;
    }

    const untilEnd = this.capacity - this.writeIndex;
    if (samples.length <= untilEnd) {
      this.buffer.set(samples, this.writeIndex);
    } else {
      this.buffer.set(samples.subarray(0, untilEnd), this.writeIndex);
      this.buffer.set(samples.subarray(untilEnd), 0);
    }

    this.writeIndex = (this.writeIndex + samples.length) % this.capacity;
    this.filled = Math.min(this.capacity, this.filled + samples.length);
  }

  /** The contents, oldest first. */
  drain(): Int16Array {
    const out = new Int16Array(this.filled);
    if (this.filled === 0) return out;

    const start = (this.writeIndex - this.filled + this.capacity) % this.capacity;
    const untilEnd = this.capacity - start;
    if (this.filled <= untilEnd) {
      out.set(this.buffer.subarray(start, start + this.filled));
    } else {
      out.set(this.buffer.subarray(start));
      out.set(this.buffer.subarray(0, this.filled - untilEnd), untilEnd);
    }
    return out;
  }

  clear(): void {
    this.writeIndex = 0;
    this.filled = 0;
  }

  get length(): number {
    return this.filled;
  }
}

/** Grows as speech arrives; `take()` hands over the finished utterance. */
export class PcmAccumulator {
  private chunks: Int16Array[] = [];
  private total = 0;

  constructor(private readonly maxSamples: number) {}

  push(samples: Int16Array): void {
    if (this.total >= this.maxSamples) return;
    this.chunks.push(samples);
    this.total += samples.length;
  }

  take(): Int16Array {
    const out = new Int16Array(Math.min(this.total, this.maxSamples));
    let offset = 0;
    for (const chunk of this.chunks) {
      const room = out.length - offset;
      if (room <= 0) break;
      out.set(chunk.length <= room ? chunk : chunk.subarray(0, room), offset);
      offset += chunk.length;
    }
    this.reset();
    return out;
  }

  reset(): void {
    this.chunks = [];
    this.total = 0;
  }

  get length(): number {
    return this.total;
  }
}

/**
 * Wraps PCM in a WAV header.
 *
 * WAV because it is uncompressed and unambiguous: no encoder settings to get
 * wrong, and the transcription endpoint accepts it directly. At 16 kHz mono a
 * few seconds of speech is well under a hundred kilobytes, so there is nothing
 * to gain from compressing it.
 */
export function encodeWav(samples: Int16Array, sampleRate: number): Uint8Array {
  const dataBytes = samples.length * 2;
  const out = new Uint8Array(44 + dataBytes);
  const view = new DataView(out.buffer);

  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) out[offset + i] = text.charCodeAt(i);
  };

  ascii(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true); // file size minus the first 8 bytes
  ascii(8, 'WAVE');

  ascii(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM header length
  view.setUint16(20, 1, true); // format: uncompressed PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample

  ascii(36, 'data');
  view.setUint32(40, dataBytes, true);

  // `set` on an Int16Array view of the output writes the samples natively,
  // which is both faster and endian-correct on every platform we ship to.
  new Int16Array(out.buffer, 44, samples.length).set(samples);
  return out;
}

/**
 * Reinterprets a native buffer as int16 samples.
 *
 * The stream hands over an `ArrayBuffer`; a stray odd byte would make the
 * typed-array constructor throw, so the length is rounded down rather than
 * trusted.
 */
export function asInt16(buffer: ArrayBuffer): Int16Array {
  return new Int16Array(buffer, 0, Math.floor(buffer.byteLength / 2));
}

/** Mixes interleaved channels down to mono, in place of the caller's buffer. */
export function toMono(samples: Int16Array, channels: number): Int16Array {
  if (channels <= 1) return samples;

  const frames = Math.floor(samples.length / channels);
  const out = new Int16Array(frames);
  for (let frame = 0; frame < frames; frame += 1) {
    let sum = 0;
    for (let channel = 0; channel < channels; channel += 1) {
      sum += samples[frame * channels + channel];
    }
    out[frame] = Math.round(sum / channels);
  }
  return out;
}
