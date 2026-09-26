# The chess engine

Stockfish ships **inside** the app. There is no download, no CDN and no
network dependency at runtime.

The vendored copy lives at `src/engine/vendor/stockfishAsm.ts` and is generated
from the published package:

```bash
node scripts/vendor-stockfish.mjs
```

## Why the asm.js build rather than WASM

The WASM build is a 96 KB loader plus a separate 560 KB binary, and its
Emscripten wrapper ships `locateFile: (f) => f` — which overrides the usual
script-directory prefixing and resolves the binary against the *document* URL.
A React Native WebView document is loaded from an HTML string and has no useful
URL to resolve against, so the binary is never found and the engine aborts with
*"both async and sync fetching of the wasm failed"*. Pointing a `<base>` at the
CDN fixed it in a desktop browser but not on device.

The asm.js build is a single self-contained file that fetches nothing, so
embedding it removes the failure mode rather than working around it: no
network, no CORS, no base-URL resolution, no file-system access, and identical
behaviour on iOS and Android.

The cost is search speed — asm.js is slower than WASM — which is immaterial at
the 200–1500 ms move times this app uses, and still far stronger than the
built-in fallback engine.

## Licence

Stockfish is **GPL v3**. Shipping it inside this app means the app is
distributed under compatible terms. That is worth deciding deliberately before
publishing to a store, not afterwards.
