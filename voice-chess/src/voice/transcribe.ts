import { File, UploadType } from 'expo-file-system';

import { FILES, RANKS } from '@/chess/board';
import { OpenAIError, type OpenAIConfig } from './openaiClient';

/**
 * Speech-to-text.
 *
 * The clip is uploaded straight from disk by the native networking layer, which
 * avoids reading a few hundred kilobytes through JS.
 *
 * Two things do the heavy lifting on accuracy, and chess needs both:
 *
 * **`prompt`** tells the model what kind of recording this is. Without it,
 * "Nf3" reliably comes back as "an F three" and "e4" as "eat for".
 *
 * **`keywords`** is stronger still, and chess is close to its ideal case: the
 * vocabulary is tiny and completely closed. There are sixty-four squares, six
 * pieces and a handful of commands — every word the player can usefully say is
 * known in advance, so all of them are listed. The model treats them as hints,
 * not as required output, so listing a square does not make it hear one.
 */

const CHESS_VOCAB_PROMPT = [
  'Chess move dictation, spoken by a player at a board.',
  'Expect algebraic notation and spoken moves such as:',
  'e4, d5, Nf3, Bc4, Qh5, Rxd8, O-O, castle kingside, castle queenside,',
  'knight to f3, bishop takes e5, pawn to e8 promote to queen, en passant,',
  'check, checkmate, take that back, new game, what is the position.',
  'Squares are a letter a to h followed by a number 1 to 8.',
  'Letters are spoken on their own: "e4" is the letter e then the number four,',
  'never the word "eat" and never "echo".',
].join(' ');

/** Every square: a8 … h1. The single most misheard part of a spoken move. */
const SQUARE_KEYWORDS = RANKS.flatMap((rank) => FILES.map((file) => `${file}${rank}`));

const TERM_KEYWORDS = [
  'pawn', 'knight', 'bishop', 'rook', 'queen', 'king',
  'takes', 'captures', 'check', 'checkmate', 'mate', 'stalemate',
  'castle', 'kingside', 'queenside', 'short castle', 'long castle',
  'promote', 'promotion', 'en passant', 'resign', 'draw',
  'undo', 'take that back', 'new game', 'hint', 'repeat',
];

const CHESS_KEYWORDS = [...SQUARE_KEYWORDS, ...TERM_KEYWORDS];

export interface TranscriptionOptions {
  model: string;
  language?: string;
  signal?: AbortSignal;
}

/**
 * `keywords` and `languages` are recent additions, and not every model or
 * account has them. Rather than pay a failed round trip on every utterance,
 * the first rejection is remembered and the fields are dropped for the rest of
 * the session.
 */
let biasingSupported = true;

/** Exposed for tests; also lets a settings change start the session over. */
export function resetTranscriptionCapabilities(): void {
  biasingSupported = true;
}

export interface TranscriptionResult {
  text: string;
  /** Milliseconds spent in the request, useful for the latency read-out. */
  durationMs: number;
}

export async function transcribeAudio(
  config: OpenAIConfig,
  fileUri: string,
  options: TranscriptionOptions
): Promise<TranscriptionResult> {
  const startedAt = Date.now();
  const file = new File(fileUri);

  if (!file.exists) {
    throw new OpenAIError('The recording was empty.', undefined, 'unknown');
  }

  const send = (withBiasing: boolean) =>
    file.upload(`${config.baseUrl}/audio/transcriptions`, {
      httpMethod: 'POST',
      uploadType: UploadType.MULTIPART,
      fieldName: 'file',
      mimeType: mimeTypeFor(file.name),
      headers: { Authorization: `Bearer ${config.apiKey}` },
      parameters: {
        model: options.model,
        prompt: CHESS_VOCAB_PROMPT,
        response_format: 'json',
        temperature: '0',
        ...(withBiasing ? { keywords: CHESS_KEYWORDS.join(',') } : {}),
        ...(options.language ? { language: options.language } : {}),
      },
    });

  let result = await send(biasingSupported);

  // A 400 here means the model or account does not know these fields. Retry
  // once without them so an older model still transcribes, then stop asking.
  if (result.status === 400 && biasingSupported) {
    biasingSupported = false;
    result = await send(false);
  }

  if (result.status < 200 || result.status >= 300) {
    throw errorFor(result.status, result.body);
  }

  const parsed = JSON.parse(result.body) as { text?: string };
  return { text: (parsed.text ?? '').trim(), durationMs: Date.now() - startedAt };
}

/** The native upload returns a status and a body, not a `Response`. */
function errorFor(status: number, body: string): OpenAIError {
  let detail = '';
  try {
    detail = (JSON.parse(body) as { error?: { message?: string } })?.error?.message ?? '';
  } catch {
    detail = body.slice(0, 200);
  }

  const kind =
    status === 401 || status === 403
      ? 'auth'
      : status === 429
        ? 'rate-limit'
        : status >= 500
          ? 'server'
          : 'unknown';

  return new OpenAIError(detail || `Transcription failed (${status})`, status, kind);
}

function mimeTypeFor(name: string): string {
  if (name.endsWith('.m4a')) return 'audio/m4a';
  if (name.endsWith('.mp4')) return 'audio/mp4';
  if (name.endsWith('.3gp')) return 'audio/3gpp';
  if (name.endsWith('.wav')) return 'audio/wav';
  return 'audio/mpeg';
}
