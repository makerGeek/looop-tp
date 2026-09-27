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
  openMargin: 0.1,
  closeMargin: 0.05,
  minSpeechMs: 300,
  hangoverMs: 600,
  maxUtteranceMs: 3_000,
  idleTimeoutMs: 5_000,
};

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
    const { state } = feed([{ level: 0.2, ms: 100 }]);
    expect(state.floor).toBeCloseTo(0.2);
    expect(state.speaking).toBe(false);
  });

  it('caps the opening estimate, so talking early is still heard', () => {
    // Someone who starts their sentence as the microphone opens would, with an
    // uncapped seed, have their own voice adopted as the background.
    const { state } = feed([{ level: 0.8, ms: 100 }]);
    expect(state.floor).toBe(options.maxInitialFloor);

    const { events } = feed([{ level: 0.8, ms: 600 }, { level: 0.02, ms: 800 }]);
    expect(kinds(events)).toContain('speech-start');
    expect(events.filter((event) => event.kind === 'utterance')).toHaveLength(1);
  });

  it('settles a loud but steady room into the floor instead of transcribing it', () => {
    // A level of 0.5 held forever: loud, but it *is* the room. The gate opens
    // on it — the seed is capped, so it must — and the floor then catches up.
    const { events, state } = feed([{ level: 0.5, ms: 4_000 }]);

    // Whatever it decided, it must never have been sent for transcription.
    expect(kinds(events)).not.toContain('utterance');
    expect(events.filter((event) => event.kind === 'discard')).toEqual([
      expect.objectContaining({ reason: 'background' }),
    ]);
    // And it has learnt the room, so the next real sentence will be heard.
    expect(state.floor).toBeGreaterThan(0.4);
    expect(state.speaking).toBe(false);
  });

  it('hears speech over a loud room once it rises above the floor', () => {
    const { events } = feed([
      { level: 0.5, ms: 1_000 },
      { level: 0.75, ms: 600 },
    ]);
    expect(kinds(events)).toContain('speech-start');
  });

  it('comes back down quickly when a noisy moment passes', () => {
    const { state } = feed([
      { level: 0.6, ms: 500 },
      { level: 0.05, ms: 1_500 },
    ]);
    // Falling fast is what lets the next quiet sentence be heard at all.
    expect(state.floor).toBeLessThan(0.1);
  });
});

describe('utterance boundaries', () => {
  it('ends the utterance after the hangover, not at the first pause', () => {
    const { events } = feed([
      { level: 0.02, ms: 300 },
      { level: 0.6, ms: 500 }, // "knight to…"
      { level: 0.02, ms: 300 }, // …thinking. Shorter than the hangover.
      { level: 0.6, ms: 400 }, // "…f3"
      { level: 0.02, ms: 800 }, // done
    ]);

    const closes = events.filter((event) => event.kind === 'utterance');
    expect(closes).toHaveLength(1);
    // One utterance, covering both halves of the sentence.
    expect(closes[0]).toMatchObject({ reason: 'silence' });
    expect(kinds(events).filter((kind) => kind === 'speech-start')).toHaveLength(1);
  });

  it('throws away a cough instead of transcribing it', () => {
    const { events } = feed([
      { level: 0.02, ms: 300 },
      { level: 0.8, ms: 100 }, // one sample: well under minSpeechMs
      { level: 0.02, ms: 800 },
    ]);

    expect(events.filter((event) => event.kind === 'discard')).toEqual([
      expect.objectContaining({ reason: 'too-short' }),
    ]);
    expect(kinds(events)).not.toContain('utterance');
  });

  it('cuts an endless burst off at the ceiling', () => {
    const { events } = feed([
      { level: 0.02, ms: 300 },
      { level: 0.9, ms: 5_000 },
    ]);

    const closes = events.filter((event) => event.kind === 'utterance');
    expect(closes.length).toBeGreaterThanOrEqual(1);
    expect(closes[0]).toMatchObject({ reason: 'max-duration' });
  });

  it('does not let the creeping floor cut a long sentence short', () => {
    // The floor is allowed to rise during speech, to escape a roaring room.
    // Ten seconds of real talking must not trip that escape hatch.
    const { events } = feed(
      [
        { level: 0.02, ms: 300 },
        { level: 0.7, ms: 10_000 },
        { level: 0.02, ms: 800 },
      ],
      { ...options, maxUtteranceMs: 30_000 }
    );

    expect(kinds(events)).not.toContain('discard');
    expect(events.filter((event) => event.kind === 'utterance')).toEqual([
      expect.objectContaining({ reason: 'silence' }),
    ]);
  });

  it('holds through the dips inside a single word', () => {
    // Between openMargin and closeMargin: quiet enough to end a naive gate,
    // loud enough that it is plainly still the same sentence.
    const { events } = feed([
      { level: 0.02, ms: 300 },
      { level: 0.6, ms: 200 },
      { level: 0.09, ms: 200 }, // above closeMargin over a ~0.02 floor
      { level: 0.6, ms: 300 },
      { level: 0.02, ms: 800 },
    ]);

    expect(kinds(events).filter((kind) => kind === 'speech-start')).toHaveLength(1);
    expect(events.filter((event) => event.kind === 'utterance')).toHaveLength(1);
  });

  it('is ready for the next sentence immediately after one ends', () => {
    const { events } = feed([
      { level: 0.02, ms: 300 },
      { level: 0.6, ms: 500 },
      { level: 0.02, ms: 800 },
      { level: 0.6, ms: 500 },
      { level: 0.02, ms: 800 },
    ]);

    expect(events.filter((event) => event.kind === 'utterance')).toHaveLength(2);
  });
});

describe('idle', () => {
  it('gives up after a long silence so the microphone is not held open', () => {
    const { events } = feed([{ level: 0.02, ms: 6_000 }]);
    expect(kinds(events)).toContain('idle');
  });

  it('restarts the idle clock when something is actually said', () => {
    const { events } = feed([
      { level: 0.02, ms: 3_000 },
      { level: 0.6, ms: 500 },
      { level: 0.02, ms: 3_000 },
    ]);
    // 6.5s in total, but never 5s of continuous quiet.
    expect(kinds(events)).not.toContain('idle');
  });
});

describe('createVad', () => {
  it('threads state through successive pushes', () => {
    const vad = createVad({ ...options });
    vad.push(0.02, 0);
    vad.push(0.02, 100);
    expect(vad.speaking).toBe(false);
    expect(vad.push(0.7, 200)).toEqual({ kind: 'speech-start' });
    expect(vad.speaking).toBe(true);
  });

  it('forgets an utterance in progress on reset', () => {
    const vad = createVad({ ...options });
    vad.push(0.02, 0);
    vad.push(0.7, 100);
    expect(vad.speaking).toBe(true);
    vad.reset();
    expect(vad.speaking).toBe(false);
    expect(vad.floor).toBeNull();
  });
});
