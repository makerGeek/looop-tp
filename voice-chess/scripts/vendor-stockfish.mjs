/**
 * Vendors Stockfish into the app so the engine never depends on the network.
 *
 *     node scripts/vendor-stockfish.mjs
 *
 * We take the **asm.js** build rather than the WASM one, deliberately. The WASM
 * build is a 96 KB loader plus a separate 560 KB binary, and its Emscripten
 * wrapper ships `locateFile: (f) => f`, which resolves the binary against the
 * *document* URL. Inside a React Native WebView the document is loaded from a
 * string, so there is no stable URL to resolve against and the binary cannot be
 * found. The asm.js build is a single self-contained file with no fetch at all,
 * which removes the failure mode entirely.
 *
 * Stockfish is GPL v3. Shipping it inside this app means the app is
 * distributed under compatible terms — see assets/engine/README.md.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION = '10.0.2';
const SOURCE = `https://cdn.jsdelivr.net/npm/stockfish.js@${VERSION}/stockfish.js`;
const here = dirname(fileURLToPath(import.meta.url));
const target = join(here, '..', 'src', 'engine', 'vendor', 'stockfishAsm.ts');

const response = await fetch(SOURCE);
if (!response.ok) throw new Error(`Could not download Stockfish: ${response.status}`);
const source = await response.text();

// The engine is inlined into an HTML document, so it must not be able to close
// the script tag that hosts it, and must survive being a JS string literal.
if (/<\/script/i.test(source)) throw new Error('Engine source would close its own <script> tag');

const banner = `// @ts-nocheck
/**
 * Stockfish ${VERSION} (asm.js build), vendored verbatim.
 *
 * GENERATED FILE — do not edit. Regenerate with:
 *     node scripts/vendor-stockfish.mjs
 *
 * Source:  ${SOURCE}
 * Licence: GPL v3 (Stockfish contributors; JS build by Niklas Fiekas)
 *
 * Kept in-tree so the engine works with no network, no CORS and no base-URL
 * resolution — the three things that made the CDN-hosted build unreliable
 * inside a WebView.
 */
`;

writeFileSync(target, `${banner}export const STOCKFISH_ASM_SOURCE = ${JSON.stringify(source)};\n`);
console.log(`wrote ${target} (${(source.length / 1024 / 1024).toFixed(2)} MB of engine)`);
