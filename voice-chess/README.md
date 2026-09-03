# Voice Chess

A cross-platform mobile chess app you play by talking. Say “knight to f3” and the
knight goes to f3. Say “take that back” and it does. Ask “what’s the position?”
and it tells you, briefly.

Built with Expo and React Native. Stockfish (WebAssembly) plays the CPU side.
OpenAI handles speech-to-text, speech, and the harder end of natural language.

> **The one rule that shapes the whole design:** the language model never
> decides what is legal. It only ever *describes* what it thinks it heard. A
> chess library — and only the chess library — turns that description into a
> move, or refuses it. [Why this matters →](docs/architecture.md#the-legality-boundary)

---

## Run it

```bash
cd voice-chess
npm install
npm start
```

Then press `i` for the iOS simulator, `a` for an Android emulator, or scan the
QR code with [Expo Go](https://expo.dev/go) on a physical device. A phone is
the better experience — that is where the microphone is.

That's the whole setup. The app is fully playable with no configuration: you can
tap or drag pieces, type moves, and play a full game against the engine.

### Turning on voice

Voice needs an OpenAI API key. Two ways to provide one:

**In the app** — open **Settings → OpenAI**, paste your key, tap *Save key*. It's
stored in the device keychain (`expo-secure-store`) and never leaves the device
except in requests to OpenAI.

**In a `.env` file** — for development:

```bash
cp .env.example .env
# then set EXPO_PUBLIC_OPENAI_API_KEY=sk-...
```

> ⚠️ `EXPO_PUBLIC_*` variables are compiled into the JavaScript bundle and can be
> extracted from a shipped binary. That's fine for local development and a
> personal build. For a public release, put the three OpenAI calls behind a
> proxy you control — see [docs/architecture.md](docs/architecture.md#shipping-this-for-real).

---

## What it does

**Play**
- Player vs CPU at five strengths, from *Casual* (~800 Elo) to *Brutal* (full strength)
- Pass-and-play on one device, with the board auto-flipping between turns
- Take back, redo, resign, offer a draw, ask for a hint
- Games survive an app restart; the menu offers to resume

**Talk**
- Hold-to-talk or tap-to-toggle, your choice
- Natural phrasing: “e4”, “knight to f3”, “bishop takes e5”, “castle short”,
  “pawn to e8, promote to a knight”, “take that back”, “what’s the position?”
- Clarifying questions when two pieces could do the same thing — *“Which knight,
  the one on c3 or e3?”* — and the answer can be a fragment: *“the one on e3.”*
- Spoken replies that stay short and sound like a person, not an announcer
- A visible transcript of what was heard and what was said, so a misfire is
  always diagnosable

**Look at**
- Animated piece movement, including the rook when you castle
- Last-move and check highlighting, legal-move dots, capture rings
- Captured-piece trays with a running material score
- Move list, promotion sheet, full light/dark theming that follows the system

**Keep working when things break**
- No API key, no network, or a rejected key → typed and tapped moves still work,
  the deterministic voice grammar still parses, and the on-device voice still speaks
- Stockfish can't load → a built-in JavaScript engine takes over, and the UI says so

---

## Project layout

```
voice-chess/
├── app/                        Expo Router screens
│   ├── _layout.tsx             Providers: gestures → theme → engine → stack
│   ├── index.tsx               Menu: new game, resume, status
│   ├── game.tsx                The board, the mic, the conversation
│   └── settings.tsx            Appearance, voice, board, key, engine
├── src/
│   ├── chess/                  Pure domain. No React, no I/O.
│   │   ├── rules.ts            ChessGame — the ONLY authority on legality
│   │   ├── narration.ts        Moves → short spoken English
│   │   └── board.ts            Squares, coordinates, piece names
│   ├── voice/                  The listening half
│   │   ├── normalize.ts        Repairs predictable transcription errors
│   │   ├── grammar.ts          Offline deterministic parser (runs first)
│   │   ├── nlu.ts              Language-model parser (runs second, if needed)
│   │   ├── resolve.ts          Constraints ∩ legal moves — the trust boundary
│   │   ├── interpret.ts        Pure decision logic, incl. clarifying questions
│   │   ├── dialogue.ts         What the app says, and how
│   │   ├── transcribe.ts       Speech-to-text
│   │   ├── speak.ts            Text-to-speech, with fallbacks
│   │   └── useVoiceSession.ts  The record → parse → act loop
│   ├── engine/                 The thinking half
│   │   ├── EngineProvider.tsx  Hosts Stockfish in a hidden WebView
│   │   ├── stockfishEngine.ts  UCI client (testable without a WebView)
│   │   ├── stockfishHarness.ts The WASM host page
│   │   ├── localEngine.ts      Pure-JS fallback engine
│   │   └── useCpuTurn.ts       Connects "engine's turn" to "ask the engine"
│   ├── state/                  Zustand stores (game, settings)
│   ├── multiplayer/            The seam online play will slot into
│   ├── components/             Board, pieces, mic, move list, sheets, UI kit
│   └── theme/                  Tokens and the light/dark provider
├── docs/
│   ├── architecture.md         How it fits together and why
│   ├── voice.md                The voice pipeline in detail
│   └── online-play.md          The plan for multiplayer
└── __tests__ colocated as *.test.ts(x)
```

---

## Building an installable app

The dev server above is the fastest way to try it. To get a build you can hand to
someone, use [EAS Build](https://docs.expo.dev/build/introduction/) — it compiles
on Expo's infrastructure and gives you a shareable install page.

It needs an Expo account. Either run `npx eas login`, or set a
[personal access token](https://expo.dev/settings/access-tokens):

```bash
export EXPO_TOKEN=...
```

Then, once per project, link it to your Expo account:

```bash
npx eas init          # creates the project and writes its id into app.json
```

**Android** — no extra accounts needed. Produces an `.apk` anyone can sideload:

```bash
npm run build:android
```

**iOS** — needs a paid Apple Developer account so EAS can register the target
devices. Produces an ad-hoc `.ipa`:

```bash
npm run build:ios
```

**iOS simulator** — no Apple account needed, but it only runs on a Mac:

```bash
npm run build:ios:simulator
```

Each finishes with a link like `https://expo.dev/accounts/<you>/projects/voice-chess/builds/<id>`,
which carries a QR code and a direct download. Build profiles live in
[`eas.json`](eas.json).

---

## Commands

| Command | What it does |
| --- | --- |
| `npm start` | Expo dev server |
| `npm run ios` / `npm run android` | Dev server, opening a simulator |
| `npm test` | The full suite (165 tests) |
| `npm run test:watch` | Watch mode |
| `npm run test:coverage` | Coverage report |
| `npm run typecheck` | `tsc --noEmit`, strict |
| `npm run lint` | ESLint, Expo config |
| `npm run doctor` | Dependency and config health check |
| `npm run build:android` | EAS Build → installable APK |
| `npm run build:ios` | EAS Build → ad-hoc iOS build |
| `npm run build:ios:simulator` | EAS Build → iOS simulator build |

---

## Things worth knowing

**Stockfish runs in a WebView.** React Native has no WebAssembly runtime, so the
engine lives in a zero-sized `WebView` and speaks UCI over `postMessage`. The
build is fetched from a CDN on first run and cached by the system WebView; if it
can't load, the app falls back to the built-in engine and says so in the header.
See [docs/architecture.md](docs/architecture.md#running-stockfish-on-a-phone).

**The grammar runs before the model.** Most of what people say at a chessboard is
a small closed vocabulary. Matching it locally is instant, free and works
offline; the language model is only consulted when the local parser is unsure.
See [docs/voice.md](docs/voice.md).

**Online play isn't built, but the seam is.** `src/multiplayer/transport.ts`
defines the interface a network transport would implement, and local play already
goes through it. See [docs/online-play.md](docs/online-play.md).

---

## Requirements

- Node 20+
- An iOS simulator, Android emulator, or a phone with Expo Go
- Optional: an OpenAI API key, for voice

Expo SDK 57 · React Native 0.86 · React 19 · TypeScript (strict)
