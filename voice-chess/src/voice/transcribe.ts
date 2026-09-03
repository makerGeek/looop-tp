import { File, UploadType } from 'expo-file-system';

import { OpenAIError, type OpenAIConfig } from './openaiClient';

/**
 * Speech-to-text.
 *
 * The recorded clip is uploaded straight from disk by the native networking
 * layer, which avoids reading a multi-hundred-kilobyte buffer into JS.
 *
 * The `prompt` field is doing real work here: transcription models are far more
 * accurate with chess vocabulary when they've been told to expect it. Without
 * it, "Nf3" reliably comes back as "an F three" and "e4" as "eat for".
 */

const CHESS_VOCAB_PROMPT = [
  'Chess move dictation.',
  'Expect algebraic notation and spoken moves such as:',
  'e4, d5, Nf3, Bc4, Qh5, Rxd8, O-O, castle kingside, castle queenside,',
  'knight to f3, bishop takes e5, pawn to e8 promote to queen, en passant,',
  'check, checkmate, take that back, new game, what is the position.',
  'Squares are a letter a to h followed by a number 1 to 8.',
].join(' ');

export interface TranscriptionOptions {
  model: string;
  language?: string;
  signal?: AbortSignal;
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

  const result = await file.upload(`${config.baseUrl}/audio/transcriptions`, {
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
      ...(options.language ? { language: options.language } : {}),
    },
  });

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
