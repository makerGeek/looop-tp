import { buildStockfishHarness } from './stockfishHarness';
import { STOCKFISH_ASM_SOURCE } from './vendor/stockfishAsm';

describe('buildStockfishHarness', () => {
  const html = buildStockfishHarness();

  it('embeds the engine verbatim', () => {
    // The guard that matters: minified Stockfish contains `$&`, `$\`` and `$'`
    // sequences, which `String.replace` treats as substitution patterns in the
    // replacement string. Building the document that way corrupted the engine
    // — it still answered `uciok`, then returned no move. Only an exact,
    // byte-for-byte copy proves the document was concatenated, not replaced.
    expect(html).toContain(STOCKFISH_ASM_SOURCE);
  });

  it('leaves no unsubstituted placeholder behind', () => {
    expect(html).not.toContain('PLACEHOLDER');
  });

  it('references no network resources', () => {
    // No src=, no fetch of a sibling .wasm: the whole point of embedding.
    expect(html).not.toMatch(/<script[^>]+src=/i);
    expect(html).not.toContain('cdn.jsdelivr.net');
  });

  it('cannot have its script tag closed by the engine source', () => {
    const body = html.slice(html.indexOf('<script>') + 8);
    expect(body.slice(0, body.indexOf('</script>'))).toContain('window.__uci');
  });

  it('installs the bridge before the engine runs', () => {
    // Shadowing postMessage after the engine loaded would lose its output.
    expect(html.indexOf('window.postMessage = function')).toBeLessThan(
      html.indexOf(STOCKFISH_ASM_SOURCE)
    );
  });

  it('is stable across calls', () => {
    expect(buildStockfishHarness()).toBe(html);
  });
});
