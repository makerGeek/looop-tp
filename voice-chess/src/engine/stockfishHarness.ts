import { STOCKFISH_ASM_SOURCE } from './vendor/stockfishAsm';

/**
 * The HTML document that hosts Stockfish inside a hidden `WebView`.
 *
 * ## Why a WebView
 * React Native has no JavaScript engine that can host Stockfish's Emscripten
 * output with the threading and memory model it expects, so the engine gets a
 * browser to live in. The WebView is 1×1, invisible and non-interactive; it
 * exists purely as an engine host and speaks UCI over `postMessage`.
 *
 * ## Why the engine is embedded rather than fetched
 * Earlier versions loaded the WASM build from a CDN. That failed on real
 * devices for a reason that is worth recording: the Emscripten wrapper ships
 * `locateFile: (f) => f`, which overrides the usual script-directory prefixing
 * and returns the bare name `stockfish.wasm`. That resolves against the
 * *document* URL — and a WebView document loaded from an HTML string has no
 * useful URL to resolve against — so the binary was never found and the engine
 * aborted with "both async and sync fetching of the wasm failed".
 *
 * The asm.js build is one self-contained file that fetches nothing, so
 * inlining it removes the failure mode rather than working around it. It also
 * means the engine needs no network, no CORS and no file-system access, and
 * behaves identically on iOS and Android. The cost is that asm.js searches
 * more slowly than WASM — immaterial at the 200–1500ms move times this app
 * uses, and a far stronger opponent than the built-in fallback either way.
 *
 * ## How the engine is driven
 * `stockfish.js` is written to run as a Web Worker: it assigns a global
 * `onmessage` handler for incoming UCI commands and calls `postMessage` for
 * engine output. It is loaded as a plain script instead, so:
 *
 *   - `window.postMessage` is shadowed *before* the engine runs, so its output
 *     is forwarded to React Native rather than looping back into the page;
 *   - the `onmessage` handler the engine installs is captured and becomes the
 *     command channel.
 */

export interface HarnessMessage {
  type: 'line' | 'ready' | 'error' | 'log';
  payload: string;
}

export function buildStockfishHarness(): string {
  // The engine is concatenated in, never passed through `String.replace`:
  // `replace` gives `$&`, `$\'` and friends special meaning in the replacement
  // string, and minified Stockfish is full of `$` sequences. Using `replace`
  // here silently corrupts the engine — it boots far enough to answer `uciok`
  // and then fails to search.
  return `${HARNESS_PROLOGUE}
${STOCKFISH_ASM_SOURCE}
${HARNESS_EPILOGUE}`;
}

const HARNESS_PROLOGUE = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body>
<script>
(function () {
  function send(type, payload) {
    try {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, payload: String(payload) }));
    } catch (e) {
      /* The bridge is gone; nothing useful to do. */
    }
  }

  // Engine output arrives via postMessage(). Shadow it before the engine runs
  // so its lines reach React Native instead of the page's own handler.
  window.postMessage = function (line) { send('line', line); };

  var engineInput = null;

  // React Native injects UCI commands by calling this.
  window.__uci = function (command) {
    if (!engineInput) { send('error', 'engine is not ready for commands'); return; }
    try {
      engineInput({ data: command });
    } catch (e) {
      send('error', 'command failed: ' + e.message);
    }
  };

  window.onerror = function (message) { send('error', 'engine crashed: ' + message); };

  try {`;

const HARNESS_EPILOGUE = `  } catch (e) {
    send('error', 'engine failed to evaluate: ' + e.message);
    return;
  }

  // The engine assigns window.onmessage while evaluating above.
  engineInput = window.onmessage;
  window.onmessage = null;

  if (typeof engineInput !== 'function') {
    send('error', 'engine did not install a command handler');
    return;
  }
  send('ready', 'embedded asm.js build');
})();
</script>
</body>
</html>`;
