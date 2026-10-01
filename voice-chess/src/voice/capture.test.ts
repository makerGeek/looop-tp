/**
 * The clip builder.
 *
 * The pre-roll is the point of this module: without it the clip starts at the
 * moment speech was *detected*, which is already a beat after it began, so the
 * first syllable is missing — and in chess the first syllable is the piece.
 */

jest.mock('expo-file-system', () => ({
  File: class {
    uri = 'file:///utterance.wav';
    exists = false;
    create() {}
    write() {}
    delete() {}
  },
  Directory: class {
    exists = true;
    create() {}
  },
  Paths: { cache: {}, document: {} },
  UploadType: { MULTIPART: 1 },
}));

/* eslint-disable import/first */
import { CAPTURE_SAMPLE_RATE, Capture, PREROLL_MS } from './capture';
/* eslint-enable import/first */

/** A buffer of `ms` at the given rate, filled with a constant sample. */
function buffer(ms: number, rate = CAPTURE_SAMPLE_RATE, value = 1000) {
  const samples = new Int16Array(Math.round((rate * ms) / 1000)).fill(value);
  return { data: samples.buffer, sampleRate: rate, channels: 1 };
}

describe('Capture', () => {
  it('reports a level for every buffer, collecting or not', () => {
    const capture = new Capture();
    expect(capture.accept(buffer(100))).toBeGreaterThan(-60);
    expect(capture.collectingUtterance).toBe(false);
  });

  it('starts the clip before the speech, not at it', async () => {
    const capture = new Capture();
    // A second of room tone goes by before anyone speaks.
    for (let i = 0; i < 10; i += 1) capture.accept(buffer(100));

    capture.begin();
    capture.accept(buffer(200));
    const clip = await capture.finish();

    // 200ms was spoken, but the clip carries the pre-roll in front of it.
    expect(clip).not.toBeNull();
    expect(clip!.durationMs).toBeGreaterThan(200);
    expect(clip!.durationMs).toBeCloseTo(PREROLL_MS + 200, -2);
  });

  it('keeps only the most recent pre-roll, not the whole session', async () => {
    const capture = new Capture();
    // Ten seconds of silence — the case that used to be uploaded in full.
    for (let i = 0; i < 100; i += 1) capture.accept(buffer(100));

    capture.begin();
    capture.accept(buffer(300));
    const clip = await capture.finish();

    expect(clip!.durationMs).toBeLessThan(PREROLL_MS + 400);
  });

  it('throws the clip away when abandoned', async () => {
    const capture = new Capture();
    capture.begin();
    capture.accept(buffer(500));
    capture.abandon();

    expect(capture.collectingUtterance).toBe(false);
    expect(await capture.finish()).toBeNull();
  });

  it('resizes its buffers when the hardware picks a different rate', async () => {
    // The stream falls back through a list of rates when the one we asked for
    // is unavailable. Both buffers are measured in samples, so a ring still
    // sized for 16 kHz would hold a third of the intended pre-roll at 48 kHz.
    const capture = new Capture(CAPTURE_SAMPLE_RATE);
    for (let i = 0; i < 10; i += 1) capture.accept(buffer(100, 48_000));

    capture.begin();
    capture.accept(buffer(200, 48_000));
    const clip = await capture.finish();

    expect(clip!.durationMs).toBeCloseTo(PREROLL_MS + 200, -2);
  });

  it('caps a clip that never ends, so memory cannot run away', async () => {
    const capture = new Capture();
    capture.begin();
    for (let i = 0; i < 400; i += 1) capture.accept(buffer(100)); // 40 seconds
    const clip = await capture.finish();

    expect(clip!.durationMs).toBeLessThanOrEqual(20_000);
  });
});
