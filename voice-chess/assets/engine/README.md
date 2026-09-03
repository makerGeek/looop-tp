# Vendoring Stockfish

By default the app loads Stockfish from jsDelivr on first launch and lets the
system WebView cache it. That is convenient for development and a poor choice
for a shipped app, which should not depend on a CDN to have an opponent.

To bundle the engine instead:

1. Download both files from the `stockfish.js` package into this directory:

   ```bash
   curl -sSL -o assets/engine/stockfish.wasm.js \
     https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.wasm.js
   curl -sSL -o assets/engine/stockfish.wasm \
     https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.wasm
   ```

   (~96 KB and ~560 KB respectively.)

2. Copy them to the app's document directory on first launch with
   `expo-asset` + `expo-file-system`, and point `EXPO_PUBLIC_STOCKFISH_URL` at
   the resulting `file://` URI. `EngineProvider` passes that URL straight
   through to the WebView harness, so no other code changes.

   Emscripten resolves `stockfish.wasm` relative to the script's own URL, so
   both files must end up in the same directory.

Stockfish is GPL v3. Bundling it means the app's own source must be distributed
under compatible terms — worth deciding before you ship, not after.
