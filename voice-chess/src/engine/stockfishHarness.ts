/**
 * The HTML document that hosts Stockfish inside a hidden `WebView`.
 *
 * ## Why a WebView
 * React Native has no WebAssembly runtime, so the only way to run real
 * Stockfish on a phone without a custom native module is to give it a browser
 * to live in. The WebView is zero-sized and non-interactive; it exists purely
 * as a WASM host and speaks UCI over `postMessage`.
 *
 * ## How the engine build is wired up
 * `stockfish.wasm.js` from the `stockfish.js` package is an Emscripten build
 * meant to run as a Web Worker: it assigns a global `onmessage` handler for
 * incoming UCI commands and calls `postMessage` for engine output. We load it
 * as a plain script instead, then:
 *
 *   - shadow `window.postMessage` *before* the script runs, so engine output is
 *     forwarded to React Native rather than looping back into the page;
 *   - capture the `onmessage` handler the script installs, and use it as the
 *     command channel.
 *
 * Emscripten resolves `stockfish.wasm` relative to the URL of its own script
 * tag, so pointing at the CDN is enough for the WASM binary to load too.
 */

export const DEFAULT_STOCKFISH_URL =
  'https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.wasm.js';

/** Fallback if the WASM build can't start (older WebViews). Pure asm.js. */
export const FALLBACK_STOCKFISH_URL =
  'https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js';

export interface HarnessMessage {
  type: 'line' | 'ready' | 'error' | 'log';
  payload: string;
}

export function buildStockfishHarness(primaryUrl = DEFAULT_STOCKFISH_URL): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body>
<script>
(function () {
  var PRIMARY = ${JSON.stringify(primaryUrl)};
  var FALLBACK = ${JSON.stringify(FALLBACK_STOCKFISH_URL)};

  function send(type, payload) {
    try {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, payload: String(payload) }));
    } catch (e) {
      /* The bridge is gone; nothing useful to do. */
    }
  }

  // Engine output arrives via postMessage(). Shadow it before loading the
  // engine so its lines reach React Native instead of the page's own handler.
  window.postMessage = function (line) { send('line', line); };

  var engineInput = null;

  // React Native injects commands by calling this.
  window.__uci = function (command) {
    if (!engineInput) return;
    try {
      engineInput({ data: command });
    } catch (e) {
      send('error', 'command failed: ' + e.message);
    }
  };

  function load(url, onFail) {
    var script = document.createElement('script');
    script.src = url;
    script.onload = function () {
      // The Emscripten build assigns window.onmessage during evaluation.
      engineInput = window.onmessage;
      window.onmessage = null;
      if (typeof engineInput !== 'function') {
        onFail('engine did not install a command handler');
        return;
      }
      send('ready', url);
    };
    script.onerror = function () { onFail('failed to load ' + url); };
    document.head.appendChild(script);
  }

  load(PRIMARY, function (reason) {
    send('log', reason + ' — retrying with the asm.js build');
    load(FALLBACK, function (finalReason) { send('error', finalReason); });
  });
})();
</script>
</body>
</html>`;
}
