import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { LocalEngine } from './localEngine';
import type { EngineStatus, SearchRequest, SearchResult } from './types';

/**
 * Provides the chess engine to the whole app.
 *
 * ## Why there is no WebView here any more
 * Earlier versions hosted Stockfish in a hidden `WebView`, first loading it
 * from a CDN and then embedding it. Neither worked on a real device: the
 * Emscripten build resolves its WASM binary against a document URL the WebView
 * does not have, and once the binary was inlined the ~820 KB document either
 * failed to load or was still compiling when the boot timeout fired. Every
 * game fell back to the built-in engine anyway.
 *
 * So the built-in engine *is* the engine. It runs directly in Hermes, starts
 * instantly, needs no bridge, no WASM, no network and no permissions, and
 * behaves identically on both platforms. It is weaker than Stockfish — but a
 * weaker opponent that always works beats a stronger one that never starts.
 */

interface EngineContextValue {
  status: EngineStatus;
  search(request: SearchRequest): Promise<SearchResult>;
  stop(): void;
}

const EngineContext = createContext<EngineContextValue | null>(null);

export function EngineProvider({ children }: { children: React.ReactNode }) {
  // Lazy initial state, not a ref: created exactly once, safe to read in render.
  const [engine] = useState(() => new LocalEngine());
  const [thinking, setThinking] = useState(false);

  const status = useMemo<EngineStatus>(
    () => ({ state: thinking ? 'thinking' : 'ready', kind: engine.kind, name: engine.name }),
    [engine.kind, engine.name, thinking]
  );

  const search = useCallback(
    async (request: SearchRequest) => {
      setThinking(true);
      try {
        return await engine.search(request);
      } finally {
        setThinking(false);
      }
    },
    [engine]
  );

  const stop = useCallback(() => engine.stop(), [engine]);

  const value = useMemo<EngineContextValue>(() => ({ status, search, stop }), [search, status, stop]);

  return <EngineContext.Provider value={value}>{children}</EngineContext.Provider>;
}

export function useEngine(): EngineContextValue {
  const context = useContext(EngineContext);
  if (!context) throw new Error('useEngine must be used inside <EngineProvider>');
  return context;
}
