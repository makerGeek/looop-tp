import { Directory, File, Paths } from 'expo-file-system';

import { PcmAccumulator, PcmRing, asInt16, encodeWav, rmsDbfs, toMono } from './pcm';

/**
 * Turning a microphone stream into clips worth transcribing.
 *
 * This sits between the raw PCM buffers and the voice-activity detector, and
 * it exists to fix the single worst property of the old recorder-based
 * capture: the clip used to begin when the microphone opened. Someone who sat
 * quietly for twenty seconds and then spoke had twenty seconds of silence
 * uploaded with their sentence stuck on the end, which is the input
 * transcription models handle worst — they fill silence with invented text.
 *
 * Here the clip begins a fraction of a second *before* the detector noticed
 * speech, and ends shortly after it stopped. Nothing else is sent.
 *
 * The level it reports is an honest RMS of the actual samples. The old path
 * read `MediaRecorder.getMaxAmplitude()`, a destructive peak read that two
 * separate pollers were consuming, so each saw a random subset of the peaks.
 */

/** What transcription models want. Higher rates are resampled away anyway. */
export const CAPTURE_SAMPLE_RATE = 16_000;

/**
 * How much audio to keep on hand before speech is detected.
 *
 * The detector cannot know a sentence has begun until it has heard some of it,
 * so without this the clip is missing its own first syllable — and in chess the
 * first syllable is usually the piece. 400ms comfortably covers the detection
 * delay plus a breath.
 */
export const PREROLL_MS = 400;

/** A clip can never grow past this, however stuck the gate gets. */
const MAX_CLIP_MS = 20_000;

export interface Clip {
  uri: string;
  durationMs: number;
  sampleCount: number;
}

export class Capture {
  private preroll: PcmRing;
  private utterance: PcmAccumulator;
  private collecting = false;
  private sampleRate: number;

  constructor(sampleRate: number = CAPTURE_SAMPLE_RATE) {
    this.sampleRate = sampleRate;
    this.preroll = new PcmRing(Math.ceil((sampleRate * PREROLL_MS) / 1000));
    this.utterance = new PcmAccumulator(Math.ceil((sampleRate * MAX_CLIP_MS) / 1000));
  }

  /**
   * The hardware does not always give the rate we asked for — it falls back
   * through a list until something works. Both buffers are measured in samples,
   * so at 48 kHz a ring sized for 16 kHz would hold a third of the intended
   * pre-roll, and the clip ceiling would be three times shorter than intended.
   */
  private resizeFor(sampleRate: number): void {
    if (sampleRate === this.sampleRate) return;
    this.sampleRate = sampleRate;
    this.preroll = new PcmRing(Math.ceil((sampleRate * PREROLL_MS) / 1000));
    this.utterance = new PcmAccumulator(Math.ceil((sampleRate * MAX_CLIP_MS) / 1000));
    this.collecting = false;
  }

  /**
   * Feeds one native buffer in and reports its level.
   *
   * Always returns a level, whether or not a clip is being collected — the
   * detector needs to hear the room to know what the room sounds like.
   */
  accept(buffer: { data: ArrayBuffer; sampleRate: number; channels: number }): number {
    if (buffer.sampleRate) this.resizeFor(buffer.sampleRate);
    const samples = toMono(asInt16(buffer.data), buffer.channels || 1);

    if (this.collecting) this.utterance.push(samples);
    else this.preroll.push(samples);

    return rmsDbfs(samples);
  }

  /** Speech has begun: start the clip with the audio just before it. */
  begin(): void {
    if (this.collecting) return;
    this.utterance.reset();
    this.utterance.push(this.preroll.drain());
    this.preroll.clear();
    this.collecting = true;
  }

  /** Throws the clip away — a cough, or the room. */
  abandon(): void {
    this.collecting = false;
    this.utterance.reset();
    this.preroll.clear();
  }

  get collectingUtterance(): boolean {
    return this.collecting;
  }

  /** Ends the clip and writes it out as a WAV. Null if there is nothing in it. */
  async finish(): Promise<Clip | null> {
    this.collecting = false;
    const samples = this.utterance.take();
    this.preroll.clear();
    if (samples.length === 0) return null;

    const bytes = encodeWav(samples, this.sampleRate);
    const directory = new Directory(Paths.cache, 'voice-chess-clips');
    if (!directory.exists) directory.create({ intermediates: true });

    // One name, reused: the clip is uploaded and finished with immediately, and
    // leaving a trail of WAVs in the cache helps nobody.
    const file = new File(directory, 'utterance.wav');
    if (file.exists) file.delete();
    file.create();
    file.write(bytes);

    return {
      uri: file.uri,
      durationMs: Math.round((samples.length / this.sampleRate) * 1000),
      sampleCount: samples.length,
    };
  }
}
