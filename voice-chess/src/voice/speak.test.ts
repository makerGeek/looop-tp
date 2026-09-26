/**
 * Regression tests for overlapping speech.
 *
 * Reported from a device: after two moves the app spoke both of them at once.
 * The cause was that `speak()` stopped current playback and *then* went off to
 * synthesise over the network, so two calls close together both passed the
 * stop before either started playing. Nothing was cancelled and both played.
 */

/** Tracks every player so a test can see if two were ever playing together. */
const players: { playing: boolean; removed: boolean; finish: () => void }[] = [];
let mockConcurrentPeak = 0;

jest.mock('expo-audio', () => ({
  setAudioModeAsync: jest.fn(async () => undefined),
  createAudioPlayer: () => {
    let listener: ((status: { didJustFinish: boolean }) => void) | null = null;
    const player = {
      playing: false,
      removed: false,
      addListener: (_event: string, callback: (status: { didJustFinish: boolean }) => void) => {
        listener = callback;
        return { remove: () => { listener = null; } };
      },
      play() {
        player.playing = true;
        const live = players.filter((p) => p.playing && !p.removed).length;
        if (live > mockConcurrentPeak) mockConcurrentPeak = live;
      },
      remove() {
        player.playing = false;
        player.removed = true;
      },
      finish() {
        player.playing = false;
        listener?.({ didJustFinish: true });
      },
    };
    players.push(player);
    return player;
  },
}));

const mockSynthDelay = { ms: 30 };

jest.mock('expo-file-system', () => ({
  File: class {
    uri = 'file:///tts.mp3';
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

jest.mock('./openaiClient', () => {
  const actual = jest.requireActual('./openaiClient');
  return {
    ...actual,
    postJsonForBytes: jest.fn(
      async () => new Promise((resolve) => setTimeout(() => resolve(new Uint8Array([1, 2, 3])), 30))
    ),
  };
});

/* eslint-disable import/first */
import { speak, stopSpeaking } from './speak';
/* eslint-enable import/first */

const config = { apiKey: 'sk-test', baseUrl: 'https://api.openai.com/v1' };

/** Lets any player that is currently playing run to completion. */
function finishAll() {
  players.filter((p) => p.playing).forEach((p) => p.finish());
}

beforeEach(async () => {
  await stopSpeaking();
  players.length = 0;
  mockConcurrentPeak = 0;
  mockSynthDelay.ms = 30;
});

describe('speak', () => {
  it('never plays two utterances at once', async () => {
    // Exactly the reported case: a move confirmation and the reply announcement
    // fired back to back, both synthesising over the network.
    const first = speak('Pawn to e4.', config);
    const second = speak('Black answers knight to f6.', config);

    // Let the first reach playback, then release it; the second follows.
    await new Promise((resolve) => setTimeout(resolve, 80));
    finishAll();
    await new Promise((resolve) => setTimeout(resolve, 80));
    finishAll();

    await Promise.all([first, second]);

    expect(mockConcurrentPeak).toBe(1);
    expect(players).toHaveLength(2);
  }, 15_000);

  it('plays queued utterances in order', async () => {
    const order: string[] = [];
    const track = (label: string) => speak(label, config).then(() => order.push(label));

    const all = Promise.all([track('first'), track('second'), track('third')]);
    for (let i = 0; i < 3; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 80));
      finishAll();
    }
    await all;

    expect(order).toEqual(['first', 'second', 'third']);
  }, 15_000);

  it('abandons queued speech when interrupted', async () => {
    const first = speak('Pawn to e4.', config);
    const second = speak('This should never be spoken.', config);

    await stopSpeaking();
    await new Promise((resolve) => setTimeout(resolve, 80));
    finishAll();

    await expect(second).resolves.toBe('silent');
    await first.catch(() => undefined);
    expect(mockConcurrentPeak).toBeLessThanOrEqual(1);
  }, 15_000);

  it('says nothing for empty text', async () => {
    await expect(speak('   ', config)).resolves.toBe('silent');
    expect(players).toHaveLength(0);
  });
});
