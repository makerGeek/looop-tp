import { DEFAULT_VAD_OPTIONS, advanceVad, createVad, initialVadState, type VadEvent, type VadOptions } from './vad';

/**
 * Tests for end-of-speech detection.
 *
 * These are the cases that decide whether continuous listening feels like a
 * conversation or like being interrupted. They run against the pure reducer, so
 * a regression here is a failing test rather than a bad afternoon on a phone.
 */

const options: VadOptions = {
  ...DEFAULT_VAD_OPTIONS,
  openMargin: 9,
  closeMargin: 5,
  minSpeechMs: 300,
  hangoverMs: 600,
  maxUtteranceMs: 3_000,
  idleTimeoutMs: 5_000,
};

/** Named levels in dBFS, so the fixtures read like the room they describe. */
const QUIET = -60; // a still bedroom
const ROOM = -45; // a normal living room
const LOUD_ROOM = -30; // a café
const SPEECH = -18; // someone talking at the phone
const SHOUT = -8;

/** Feeds a level for `ms` at 100ms per sample, collecting every event. */
function feed(levels: { level: number; ms: number }[], opts: VadOptions = options) {
  let state = initialVadState();
  const events: (VadEvent & { at: number })[] = [];
  let at = 0;

  for (const step of levels) {
    for (let elapsed = 0; elapsed < step.ms; elapsed += 100) {
      const next = advanceVad(state, { level: step.level, at }, opts);
      state = next.state;
      events.push({ ...next.event, at });
      at += 100;
    }
  }
  return { events, state };
}

const kinds = (events: (VadEvent & { at: number })[]) => events.map((event) => event.kind);

describe('noise floor', () => {
  it('learns the room from the first sample rather than assuming silence', () => {
    const { state } = feed([{ level: ROOM, ms: 100 }]);
    expect(state.floor).toBeCloseTo(ROOM);
    expect(state.speaking).toBe(false);
  });

  it('caps the opening estimate, so talking early is still heard', () => {
    // Someone who starts their sentence as the microphone opens would, with an
    // uncapped seed, have their own voice adopted as the background.
    const { state } = feed([{ level: SHOUT, ms: 100 }]);
    expect(state.floor).toBe(options.maxInitialFloor);

    const { events } = feed([{ level: SHOUT, ms: 600 }, { level: QUIET, ms: 800 }]);
    expect(kinds(events)).toContain('speech-start');
    expect(events.filter((event) => event.kind === 'utterance')).toHaveLength(1);
  });

  it('never opens on a steady room it can treat as the floor', () => {
    // A café held at a constant level. It is loud, but it *is* the room, and
    // it does not clear the margin over its own floor.
    const { events } = feed([{ level: LOUD_ROOM, ms: 4_000 }]);
    expect(kinds(events)).not.toContain('speech-start');
    expect(kinds(events)).not.toContain('utterance');
  });

  it('settles a roar that does open the gate, without transcribing it', () => {
    // Loud enough to clear the capped opening estimate, but flat: machinery,
    // not a person. Nothing here should ever reach the transcription endpoint.
    const roar = -18;
    const { events, state } = feed([{ level: roar, ms: 4_000 }]);

    expect(kinds(events)).toContain('speech-start');
    expect(kinds(events)).not.toContain('utterance');
    expect(events.filter((event) => event.kind === 'discard')).toEqual([
      expect.objectContaining({ reason: 'background' }),
    ]);
    // Having heard it, the floor has moved up to it, so it will not re-trigger.
    expect(state.floor).toBeGreaterThanOrEqual(roar - 1);
    expect(state.speaking).toBe(false);
  });

  it('does not mistake a steady voice for machinery before it can tell', () => {
    // Flat, but short: within `dynamicRangeAfterMs`, so it is still a sentence.
    const { events } = feed([
      { level: QUIET, ms: 300 },
      { level: SPEECH, ms: 1_000 },
      { level: QUIET, ms: 800 },
    ]);
    expect(events.filter((event) => event.kind === 'utterance')).toHaveLength(1);
  });

  it('hears speech over a loud room once it rises above the floor', () => {
    const { events } = feed([
      { level: LOUD_ROOM, ms: 1_000 },
      { level: SHOUT, ms: 600 },
    ]);
    expect(kinds(events)).toContain('speech-start');
  });

  it('comes back down quickly when a noisy moment passes', () => {
    const { state } = feed([
      { level: SPEECH, ms: 500 },
      { level: QUIET, ms: 1_500 },
    ]);
    // Falling fast is what lets the next quiet sentence be heard at all.
    expect(state.floor).toBeLessThan(QUIET + 5);
  });
});

describe('utterance boundaries', () => {
  it('ends the utterance after the hangover, not at the first pause', () => {
    const { events } = feed([
      { level: QUIET, ms: 300 },
      { level: SPEECH, ms: 500 }, // "knight to…"
      { level: QUIET, ms: 300 }, // …thinking. Shorter than the hangover.
      { level: SPEECH, ms: 400 }, // "…f3"
      { level: QUIET, ms: 800 }, // done
    ]);

    const closes = events.filter((event) => event.kind === 'utterance');
    expect(closes).toHaveLength(1);
    // One utterance, covering both halves of the sentence.
    expect(closes[0]).toMatchObject({ reason: 'silence' });
    expect(kinds(events).filter((kind) => kind === 'speech-start')).toHaveLength(1);
  });

  it('throws away a cough instead of transcribing it', () => {
    const { events } = feed([
      { level: QUIET, ms: 300 },
      { level: SHOUT, ms: 100 }, // one sample: well under minSpeechMs
      { level: QUIET, ms: 800 },
    ]);

    expect(events.filter((event) => event.kind === 'discard')).toEqual([
      expect.objectContaining({ reason: 'too-short' }),
    ]);
    expect(kinds(events)).not.toContain('utterance');
  });

  it('cuts someone who never stops talking off at the ceiling', () => {
    // Varied, so it is plainly a person rather than machinery, and far longer
    // than `maxUtteranceMs`. It has to be sent, not held forever.
    const rambling: { level: number; ms: number }[] = [{ level: QUIET, ms: 300 }];
    for (let i = 0; i < 12; i += 1) {
      rambling.push({ level: i % 2 ? SHOUT : SPEECH, ms: 400 });
    }

    const { events } = feed(rambling);
    const closes = events.filter((event) => event.kind === 'utterance');
    expect(closes.length).toBeGreaterThanOrEqual(1);
    expect(closes[0]).toMatchObject({ reason: 'max-duration' });
  });

  it('does not cut a long, varied sentence short', () => {
    // Ten seconds of real talking — loud syllables, quieter ones, gaps too
    // brief to end the utterance. The background test must not fire on this.
    const sentence: { level: number; ms: number }[] = [{ level: QUIET, ms: 300 }];
    for (let i = 0; i < 20; i += 1) {
      sentence.push({ level: i % 2 ? SPEECH : SPEECH - 8, ms: 500 });
    }
    sentence.push({ level: QUIET, ms: 800 });

    const { events } = feed(sentence, { ...options, maxUtteranceMs: 30_000 });

    expect(kinds(events)).not.toContain('discard');
    expect(events.filter((event) => event.kind === 'utterance')).toEqual([
      expect.objectContaining({ reason: 'silence' }),
    ]);
  });

  it('holds through the dips inside a single word', () => {
    // Between openMargin and closeMargin: quiet enough to end a naive gate,
    // loud enough that it is plainly still the same sentence.
    const { events } = feed([
      { level: QUIET, ms: 300 },
      { level: SPEECH, ms: 200 },
      { level: QUIET + 7, ms: 200 }, // between the close and open margins
      { level: SPEECH, ms: 300 },
      { level: QUIET, ms: 800 },
    ]);

    expect(kinds(events).filter((kind) => kind === 'speech-start')).toHaveLength(1);
    expect(events.filter((event) => event.kind === 'utterance')).toHaveLength(1);
  });

  it('is ready for the next sentence immediately after one ends', () => {
    const { events } = feed([
      { level: QUIET, ms: 300 },
      { level: SPEECH, ms: 500 },
      { level: QUIET, ms: 800 },
      { level: SPEECH, ms: 500 },
      { level: QUIET, ms: 800 },
    ]);

    expect(events.filter((event) => event.kind === 'utterance')).toHaveLength(2);
  });
});

describe('idle', () => {
  it('gives up after a long silence so the microphone is not held open', () => {
    const { events } = feed([{ level: QUIET, ms: 6_000 }]);
    expect(kinds(events)).toContain('idle');
  });

  it('restarts the idle clock when something is actually said', () => {
    const { events } = feed([
      { level: QUIET, ms: 3_000 },
      { level: SPEECH, ms: 500 },
      { level: QUIET, ms: 3_000 },
    ]);
    // 6.5s in total, but never 5s of continuous quiet.
    expect(kinds(events)).not.toContain('idle');
  });
});

describe('createVad', () => {
  it('threads state through successive pushes', () => {
    const vad = createVad({ ...options });
    vad.push(QUIET, 0);
    vad.push(QUIET, 100);
    expect(vad.speaking).toBe(false);
    expect(vad.push(SPEECH, 200)).toEqual({ kind: 'speech-start' });
    expect(vad.speaking).toBe(true);
  });

  it('forgets an utterance in progress on reset', () => {
    const vad = createVad({ ...options });
    vad.push(QUIET, 0);
    vad.push(SPEECH, 100);
    expect(vad.speaking).toBe(true);
    vad.reset();
    expect(vad.speaking).toBe(false);
    expect(vad.floor).toBeNull();
  });
});
