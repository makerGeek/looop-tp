# The voice pipeline

## The loop

```
   hold the mic  ─── or, in continuous mode, vad.ts decides
        │                     where the sentence ended
        ▼
   expo-audio ──────────────▶  an .m4a in the cache directory
        │
        ▼
   transcribe.ts ───────────▶  "night to eff three"
        │
        ▼
   normalize.ts ────────────▶  "knight to f3"
        │
        ▼
   grammar.ts ──────────────▶  { piece: 'n', to: 'f3' }        confidence 0.90
        │  (unsure?)
        ▼
   nlu.ts ──────────────────▶  { piece: 'n', to: 'f3' }        confidence 0.95
        │
        ▼
   resolve.ts ──────────────▶  intersect with legalMoves()
        │
        ▼
   interpret.ts ────────────▶  move | clarify | promotion | reject | unheard
        │
        ▼
   gameStore + speak.ts ────▶  the board moves, the app says "Knight to f3."
```

---

## Stage by stage

### 1. Recording

`expo-audio`, `RecordingPresets.HIGH_QUALITY` **plus `isMeteringEnabled: true`**,
straight to the cache directory. That flag matters more than it looks: no preset
sets it, and without it `metering` is simply `undefined` — no input-level ring,
and nothing for the voice-activity detector to detect. It fails silently rather
than loudly, so there is a test asserting the recorder is configured with it.

Three interaction models, selectable in Settings:

- **Hold to talk** (default) — matches the walkie-talkie model most people
  already have, and the endpoint is unambiguous: you decide when you're done.
- **Tap to toggle** — better for accessibility, and for thinking mid-sentence.
- **Always listening** — one tap and the microphone is yours for the rest of the
  game. See below.

The mic ring tracks live input level. Seeing that you're being heard is the
single most reassuring thing a voice UI can do, and it costs one shared value.

### 1b. Continuous listening — [`vad.ts`](../src/voice/vad.ts)

Continuous listening has to answer one question over and over: *has this person
finished talking?* Nothing on the device will say so, and sending a fixed-length
clip every few seconds is both wasteful and unpleasant — it cuts people off
mid-sentence and pays to transcribe silence.

What the recorder does give us is an input level. `vad.ts` turns a stream of
those into utterance boundaries, and it is a **pure reducer**: state plus sample
in, state plus event out. No timers, no recorder, no React. That is the whole
reason end-of-speech behaviour is testable rather than guessed at on a phone.

Four details carry the weight:

| Problem | What it does |
| --- | --- |
| Rooms differ, and phone gain drifts | The threshold rides a noise floor tracked while nobody is talking — fast down to a quieter room, slow up to a louder one |
| A single threshold chatters dozens of times per word | Separate open and close margins (hysteresis) |
| People pause to think — "knight to… f3" | A pause only ends the utterance after `hangoverMs` of quiet |
| Coughs, chairs, doors | `minSpeechMs` discards bursts too brief to be a sentence, without spending a transcription |

Two cases are less obvious and cost a round of rework each:

- **Someone who starts talking as the microphone opens** would, with a floor
  seeded from the first sample, have their own voice adopted as the background
  and never be heard at all. The seed is capped (`maxInitialFloor`).
- Which means a **genuinely loud room** does open the gate. So the floor is
  allowed to creep upward *during* speech — slowly enough that a ten-second
  sentence is untouched, fast enough that a steady roar is reclassified as the
  floor within a couple of seconds. When the gate then closes with the level
  still high, nothing actually went quiet: the floor caught up with the room, so
  the clip holds no speech and is discarded rather than transcribed
  (`discard`, reason `background`).

The loop around it lives in
[`useVoiceSession.ts`](../src/voice/useVoiceSession.ts) and does the parts that
are not pure: sampling every 100ms, skipping a warmup window while the encoder
settles, and closing and reopening the recorder around each utterance.

It also keeps the microphone **shut while the app is talking**. This is not
politeness. Playing audio sets `allowsRecording: false`, so a microphone held
open through an utterance records the app's own voice, when it records anything
at all. `speak.ts` exposes `isSpeaking()` and `whenQuiet()` for exactly this,
and the engine contributes `isBusy()` — it will announce its move the instant
the search finishes, so the microphone stays closed through the search too.

Three guards stop it running away: a `maxUtteranceMs` ceiling, an
`idleTimeoutMs` that ends the session when nobody has spoken for a while, and a
consecutive-failure count that gives up rather than looping on a key that will
never work.

### 2. Transcription

`POST /v1/audio/transcriptions`, uploaded from disk by the native networking
layer so a few hundred kilobytes never pass through JavaScript.

The `prompt` field does real work here. Transcription models are dramatically
better with chess vocabulary once told to expect it. Without the prompt, `Nf3`
comes back as "an F three" and `e4` as "eat for" with depressing regularity.

### 3. Normalisation — [`normalize.ts`](../src/voice/normalize.ts)

Transcription errors are not random. They're a small, stable set:

| What you said | What comes back | What we do |
| --- | --- | --- |
| knight | night, nite, horse | fold onto `knight` |
| rook | rock, ruck, tower | fold onto `rook` |
| pawn | porn, prawn, pon | fold onto `pawn` |
| b4 | be four, bee 4 | glue into `b4` |
| e4 | echo four, e 4 | glue into `e4` |
| exd5 | e x d 5 | rewrite to `e takes d5` |
| O-O | oh oh, 0-0 | rewrite to `kingside castle` |

One rule earned its own comment: **"to" is never read as the number two.** It's
tempting — "e to e4" plainly means e2–e4 — but the cost is `knight to f3`
becoming `knight 2 f3`, and that phrasing is a hundred times more common. The
grammar keeps the preposition.

### 4. The offline grammar — [`grammar.ts`](../src/voice/grammar.ts)

A deterministic parser that runs **first, always**. Chess speech is a small
closed vocabulary, and matching it locally is instant, free, private, and works
on a plane.

It handles moves (`e4`, `knight to f3`, `e2 to e4`, `bishop takes e5`, `castle
short`, `pawn to e8 promote to knight`, typed `Nf3`/`Bxe5`/`O-O`), ten commands
(undo, redo, new game, resign, offer draw, repeat, flip board, hint, stop
listening, read moves), six questions (position, whose turn, last move, material,
moves from a square, captured pieces), and yes/no.

Order matters inside it: commands and questions are matched before moves, because
"what should I play" contains no square and would otherwise fall through to the
much looser move patterns. Similarly, "take that back" must reach the undo
pattern before the capture pattern sees the word "take" — which is why
`normalize.ts` deliberately doesn't fold "take" onto "takes".

Every match produces `MoveConstraints`. None of them produces a move.

### 5. The model — [`nlu.ts`](../src/voice/nlu.ts)

Consulted only when the grammar's confidence falls below 0.8, and only when a key
is configured and *Smart parsing* is on. It's for the long tail: "put the horse
in front of the bishop", "take the thing on d5", "the other knight".

It's asked for a structured description under a strict JSON schema, at
temperature 0. The schema has no field that could assert legality. It's given the
position and the legal-move list as *grounding* — context for resolving "the
knight" — with the prompt explicitly saying not to pick a move the player didn't
name.

Whichever parser is more confident wins; ties go to the grammar, which is cheaper
and cannot hallucinate.

Model output then goes through `sanitizeConstraints`, which **drops** anything
malformed rather than repairing it. A half-understood utterance that produces a
clarifying question is a much better outcome than a confidently wrong one.

### 6. Resolution — [`resolve.ts`](../src/voice/resolve.ts)

The trust boundary. Constraints meet `ChessGame.legalMoves()` and one of five
things happens:

| Result | Meaning | What the player gets |
| --- | --- | --- |
| `resolved` | exactly one legal move fits | the move is played |
| `needs-promotion` | one from/to, four pieces | *"Promoting on e8 — queen, rook, bishop or knight?"* |
| `ambiguous` | several legal moves fit | *"Which knight — the one on c3 or e3?"* |
| `illegal` | nothing legal fits | *"No knight can reach e5 right now. You could play Nf3 or Nc3."* |
| `empty` | no move information at all | *"I didn't catch that. Try 'knight to f3'."* |

Only the promotion constraint relaxes when it produces no matches — an unnamed
promotion piece shouldn't empty the candidate list. A wrong "takes" is reported
as an illegal move rather than quietly ignored, because the player asserted
something about the position and deserves to hear that it isn't true.

### 7. Interpretation — [`interpret.ts`](../src/voice/interpret.ts)

Pure. Takes a parsed utterance and a context (position, whose turn, is the game
over, is a question outstanding) and returns a decision.

Commands and questions are checked before everything else, so "new game" works on
a finished board and "what's the position?" works while the CPU is thinking.

**Clarification follow-ups** get their own path, because answers to questions are
fragments. Said cold, "c3" means *move something to c3*. Said in reply to *"which
knight — c3 or e3?"*, it plainly means *the knight on c3*. `asOriginHint`
performs exactly that rewrite, and only when the square is genuinely one of the
candidates' origins — so an unrelated move said mid-question still means what it
says.

### 8. Speaking — [`speak.ts`](../src/voice/speak.ts)

A ladder, tried in order:

1. **OpenAI speech** — warm, natural, worth the round trip. Style is steered with
   an `instructions` field: *"a friendly, focused chess partner sitting across the
   board… the easy rhythm of a person thinking aloud."*
2. **The device voice** (`expo-speech`) — instant, offline, unglamorous.
3. **Silence** — the line still appears on screen.

Synthesised clips are content-addressed in the cache directory, so repeated lines
("Check.", "Taken back.") are only ever fetched once.

---

## What it says, and why

Spoken feedback has one enemy: length. A partner who narrates is a partner you
stop listening to. Every line in [`dialogue.ts`](../src/voice/dialogue.ts) and
[`narration.ts`](../src/chess/narration.ts) is built to be short and specific.

- `Nf3` → **"Knight to f3."**
- `exd5` → **"Pawn takes on d5."**
- `O-O` → **"Castles kingside."**
- `e8=Q+` → **"Pawn to e8, promotes to queen. Check."**

Confirmations vary slightly ("Got it.", "Okay.", or nothing) so the app doesn't
sound like a loop. Refusals always end with something the player *can* do —
*"No knight can reach e5 right now. You could play Nf3 or Nc3."* A clarifying
question with real options beats "sorry, I didn't understand" every single time.

---

## When it goes wrong

The conversation log shows what was heard next to what was said. "I said knight to
f3, it heard *night f five*" is instantly diagnosable; a silent wrong guess never
is. That's the entire reason the transcript is on screen rather than in a debug
menu.

Beyond that, every failure has a floor:

| Failure | What still works |
| --- | --- |
| No API key | Grammar parsing of typed moves, device voice, tap and drag |
| No network | Same, plus the built-in engine |
| Key rejected (401) | A spoken explanation naming Settings, then the same fallbacks |
| Rate limited (429) | "Try again in a moment" — the game is untouched |
| Mic permission denied | A one-line explanation, and the typed-move field |
| Transcript is empty | Nothing happens, silently. Not every button press is speech. |

---

## Testing it

The pipeline is tested at every level, and the levels are chosen so that almost
none of it needs a device:

- [`normalize.test.ts`](../src/voice/normalize.test.ts) — the mishearings above
- [`grammar.test.ts`](../src/voice/grammar.test.ts) — every phrasing, command and question
- [`resolve.test.ts`](../src/voice/resolve.test.ts) — the trust boundary, including hallucinated SAN
- [`interpret.test.ts`](../src/voice/interpret.test.ts) — clarifying questions and their answers
- [`nlu.test.ts`](../src/voice/nlu.test.ts) — defensive handling of malformed model output
- [`pipeline.test.ts`](../src/voice/pipeline.test.ts) — transcript to board, end to end, plus a
  simulated hallucinating model that is not allowed to move anything

```bash
npm test
```
