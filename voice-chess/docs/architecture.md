# Architecture

## The shape of it

```
                      ┌─────────────────────────────────────────┐
   microphone ───────▶│  voice/     record → transcribe → parse  │
                      └──────────────────┬──────────────────────┘
                                         │  MoveConstraints
                                         │  (a *description*, never a decision)
                                         ▼
   touch / drag ─────▶┌─────────────────────────────────────────┐
                      │  voice/resolve.ts                       │
   Stockfish ────────▶│  constraints ∩ legalMoves()             │
                      └──────────────────┬──────────────────────┘
                                         │  a Move that provably exists
                                         ▼
                      ┌─────────────────────────────────────────┐
                      │  state/gameStore.ts → chess/rules.ts     │
                      │  ChessGame.tryMove() — the only mutator  │
                      └──────────────────┬──────────────────────┘
                                         │  PositionSnapshot
                                         ▼
                      ┌─────────────────────────────────────────┐
                      │  components/  board, trays, move list    │
                      └─────────────────────────────────────────┘
```

Three things produce moves — a person's voice, a person's finger, and an engine.
All three converge on one function. Nothing has a private door.

---

## The legality boundary

This is the load-bearing decision in the project, so it's worth being precise
about what it means and how it's enforced.

### The rule

> A language model may describe an utterance. It may not decide what is legal.

### Why it's not just a style preference

Language models produce plausible chess. Plausible chess is *mostly* legal chess,
which is the worst possible failure mode: it works in the demo and then, once in
a few hundred moves, quietly moves a pinned bishop or castles through check. In a
game, a rule violation isn't a glitch — it's the end of the game's meaning. There
is no graceful degradation from "the app cheated".

### How it's enforced

The enforcement is structural, not a check someone has to remember to write.

**1. The model's output type can't express legality.**
`MoveConstraints` ([`src/voice/intents.ts`](../src/voice/intents.ts)) has fields
for a piece, an origin, a destination, a promotion. It has no field that means
"this is playable". The JSON schema sent to the model
([`src/voice/nlu.ts`](../src/voice/nlu.ts)) mirrors it exactly, so there is
nothing for the model to assert even if it wanted to.

**2. SAN is a lookup key, not a claim.**
The model may return `"Qh5#"`. `resolveMove` treats that string as a *key* into
the legal-move list and nothing more:

```ts
const wanted = canonicalSan(constraints.san);
const hit = legalMoves.find((move) => canonicalSan(move.san) === wanted);
if (hit) return { status: 'resolved', move: hit };
// no hit → fall through to the structural constraints, never to the string
```

A hallucinated SAN matches nothing and is discarded. It cannot become a move.

**3. Every resolution is a selection from a list the rules produced.**
`resolveMove` only ever *filters* `ChessGame.legalMoves()`. It has no code path
that constructs a move. The strongest possible statement about its output is
therefore true by construction: whatever it returns was already legal.

**4. The store re-checks anyway.**
`applyMove` and `applyEngineMove` both go through `ChessGame.tryMove()`, which
returns `null` for anything chess.js rejects. Even a resolver bug, or an engine
returning garbage, cannot put a piece on a square it may not occupy.

**5. Tests assert the property, not just the examples.**
[`src/voice/pipeline.test.ts`](../src/voice/pipeline.test.ts) feeds the pipeline
the exact shape a hallucinating model produces — high confidence, well-formed,
completely wrong — and asserts the board doesn't move. `resolve.test.ts` walks a
list of adversarial constraints and asserts that any resolved move is in the
legal list.

### What the model *is* trusted with

Interpretation. "The knight" when two knights can move. "Take it" when there's
one capture available. "The other one" after a clarifying question. That's real
work, and it's work where being wrong is cheap: a misinterpretation produces a
clarifying question or a polite refusal, never an illegal position.

It's also given the legal-move list as *grounding* — context that helps it map
vague speech onto real options. Grounding is not authority: the list it is shown
is the same list its answer is checked against.

---

## Layers

### `src/chess` — the domain

Plain TypeScript. No React, no I/O, no platform. `ChessGame` wraps `chess.js` and
is the only place a move is ever made. It exposes:

- `legalMoves()` — the list everything else selects from
- `tryMove()` — returns a `MoveRecord` or `null`; never throws, so "illegal" is
  ordinary control flow rather than an exception to remember to catch
- `snapshot()` — everything the UI needs in one immutable object, including
  captured pieces, material balance and the enriched history

`narration.ts` turns those facts into short spoken sentences. It's deliberately
separate from `dialogue.ts` (what the app says *about* the conversation), because
the two change for different reasons.

### `src/voice` — listening and speaking

See [voice.md](voice.md) for the pipeline in detail. The important structural
point is that `interpret.ts` is *pure*: it takes a parsed utterance and a
position and returns a decision. Every interesting behaviour — clarifying
questions, follow-up answers, refusing to move out of turn — is therefore
testable with no audio, no network and no renderer.

### `src/engine` — the opponent

`ChessEngine` is a three-method interface. Two implementations satisfy it:
`StockfishEngine` (real strength, needs a WebView) and `LocalEngine` (modest
strength, needs nothing). `EngineProvider` picks between them at runtime and
tells the UI which one is playing, because an opponent that silently got weaker
is worse than one that says so.

`StockfishEngine` holds only the UCI protocol — it's handed a `send` function and
fed lines. That's why `stockfishEngine.test.ts` can drive the entire handshake,
search, timeout and cancellation logic with no browser at all.

### `src/state` — the stores

Two Zustand stores. `gameStore` holds the game; `settingsStore` holds
preferences. Both are plain synchronous state machines: the CPU turn and the
voice loop are hooks that *drive* them from outside. That separation is what
lets `gameStore.test.ts` run in Node.

Persistence is deliberate about what it keeps. The game is saved as PGN and
replayed on launch. The API key is *excluded* from the persisted blob and kept in
the device keychain instead.

### `src/components` — the board

`Board` is presentational: a position, some highlights, and callbacks. It doesn't
know whether it's showing a CPU game, a pass-and-play game or (later) an online
one.

Pieces are keyed by `square + colour + type`. When a piece moves, the component
at the origin unmounts and a new one mounts at the destination with an
`animateFrom` prop; it starts offset by that delta and springs to zero, which
reads as a slide. Castling passes the rook's origin too, so both pieces move.

---

## Running Stockfish on a phone

React Native has no WebAssembly runtime, so the options are: ship a native module
(a big build-config commitment, and no Expo Go), or give the engine a browser.
This app does the second.

[`stockfishHarness.ts`](../src/engine/stockfishHarness.ts) builds a page that
loads `stockfish.wasm.js` from the `stockfish.js` package. That build is an
Emscripten artifact written to run as a Web Worker: it installs a global
`onmessage` for UCI input and calls `postMessage` for output. We load it as a
plain script and adapt it:

- `window.postMessage` is shadowed **before** the engine script runs, so engine
  output is forwarded to React Native instead of looping back into the page's own
  handler
- the `onmessage` handler the script installs is captured and becomes the command
  channel

Emscripten resolves `stockfish.wasm` relative to its own `<script>` URL, so
pointing the tag at the CDN is enough for the WASM binary to load as well. Single
threaded, so no `SharedArrayBuffer` and no COOP/COEP headers to arrange.

**The failure path is a first-class feature.** If the script 404s, the WebView
errors, or the handshake doesn't finish inside 15 seconds, `EngineProvider`
switches to `LocalEngine` and the header says *"Built-in engine"*. A failed
search falls back for that one move without retiring Stockfish. Settings has a
*Restart engine* button for when the network comes back.

To run fully offline, vendor `stockfish.wasm.js` and `stockfish.wasm` into
`assets/engine/` and point `EXPO_PUBLIC_STOCKFISH_URL` at the bundled copy.

---

## Design system

Everything visual comes from [`src/theme/tokens.ts`](../src/theme/tokens.ts):
colour, spacing, radius, type scale and — importantly — motion. Having one
`motion.piece` spring shared by every piece on the board is what makes the
animation feel like one system rather than a collection of tuned components.

`ThemeProvider` resolves the user's preference against the OS setting and
publishes a `Theme`. No component holds a hex value.

---

## Shipping this for real

Two things would need to change before this went to an app store.

**1. Move the OpenAI calls behind a proxy.** They're isolated in three files
(`transcribe.ts`, `speak.ts`, `nlu.ts`), each of which takes an `OpenAIConfig`
with a `baseUrl`. Pointing that at your own endpoint and dropping the
`Authorization` header is the whole change; the app doesn't otherwise care.

**2. Vendor the engine.** See above. A CDN dependency on first launch is fine for
development and rude in a shipped app.

Neither is a refactor. That's the point of putting the seams where they are.
