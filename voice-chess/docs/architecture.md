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

## The engine

`ChessEngine` is a three-method interface. One implementation satisfies it:
`LocalEngine`, a negamax search written in plain TypeScript that runs directly
in Hermes.

**There used to be two.** Stockfish was hosted in a hidden `WebView`, first
fetched from a CDN and then embedded. It never worked on a real device, across
several distinct failures:

- the Emscripten build resolves its WASM binary against a document URL a
  WebView loaded from an HTML string does not have;
- once the binary was inlined, the ~820 KB document either failed to load or
  was still compiling when the boot timeout fired;
- and the document had to be assembled by concatenation, because `String.replace`
  gives `$&`, `` $` `` and `$'` special meaning in the replacement string and
  minified Stockfish is full of `$` sequences.

Every game fell back to the JavaScript engine regardless, so the WebView was
removed: it contributed 820 KB, a boot timeout, a whole failure surface and a
status line explaining which engine had lost. A weaker opponent that always
works beats a stronger one that never starts.

### What makes the search respectable

The first version searched to a fixed depth and suffered badly from the horizon
effect — it would take a defended piece because the recapture fell one ply
beyond what it looked at. `localEngine.bench.test.ts` measures this directly:
it failed a tactical suite 4/6 and swung 8 points of material in 16 plies of
self-play.

Adding **quiescence search** — searching on past the depth limit while captures
remain — and **MVV-LVA move ordering** took it to 6/6 with a 3-point swing.
Those are the two changes that separate an opponent that feels weak from one
that feels broken.

Strength is then shaped per difficulty: `chooseWithSkill` widens the window of
"acceptable" moves as the level drops, so weak levels make recognisable
human-style mistakes rather than playing blind.

### The turn loop

`useCpuTurn` connects "it is the engine's turn" to "ask the engine". It takes
only the *actions* from the engine context, never the context object itself —
that object re-memoises when the engine's status changes, including the
`thinking` flip that `search()` sets, and depending on it made the effect tear
down and cancel the search it had just started. The CPU silently never moved.
`useCpuTurn.test.tsx` drives a real game against a real engine to keep that
fixed.

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
