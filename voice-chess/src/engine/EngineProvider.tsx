import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { LocalEngine } from './localEngine';
import { StockfishEngine } from './stockfishEngine';
import { DEFAULT_STOCKFISH_URL, buildStockfishHarness, type HarnessMessage } from './stockfishHarness';
import type { ChessEngine, EngineStatus, SearchRequest, SearchResult } from './types';

/**
 * Hosts the chess engine for the whole app.
 *
 * A zero-sized `WebView` runs Stockfish; a pure-JS engine stands behind it. The
 * context exposes one `search()` that transparently falls back, plus a status
 * the UI can show honestly ("Stockfish" vs "Built-in engine") instead of
 * pretending the strong engine is always there.
 */

interface EngineContextValue {
  status: EngineStatus;
  /** Runs a search, falling back to the local engine if Stockfish can't. */
  search(request: SearchRequest): Promise<SearchResult>;
  stop(): void;
  /** Retries Stockfish after a failure (e.g. once the network returns). */
  retry(): void;
}

const EngineContext = createContext<EngineContextValue | null>(null);

const BOOT_TIMEOUT_MS = 15_000;

export function EngineProvider({
  children,
  stockfishUrl = process.env.EXPO_PUBLIC_STOCKFISH_URL ?? DEFAULT_STOCKFISH_URL,
}: {
  children: React.ReactNode;
  stockfishUrl?: string;
}) {
  const webViewRef = useRef<WebView>(null);
  // Lazy initial state, not a ref: these instances must be created exactly once
  // and are safe to read during render.
  const [stockfish] = useState(() => new StockfishEngine());
  const [local] = useState(() => new LocalEngine());

  const [status, setStatus] = useState<EngineStatus>({ state: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const stockfishReady = useRef(false);

  const html = useMemo(() => buildStockfishHarness(stockfishUrl), [stockfishUrl]);

  // If the WebView never reports in, stop waiting and use the local engine.
  useEffect(() => {
    stockfishReady.current = false;

    const timer = setTimeout(() => {
      if (stockfishReady.current) return;
      stockfish.fail('Stockfish took too long to start');
      setStatus({ state: 'ready', kind: 'local', name: local.name });
    }, BOOT_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [attempt, local.name, stockfish]);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let message: HarnessMessage;
      try {
        message = JSON.parse(event.nativeEvent.data) as HarnessMessage;
      } catch {
        return;
      }

      switch (message.type) {
        case 'ready':
          stockfish.attach((command) => {
            webViewRef.current?.injectJavaScript(`window.__uci(${JSON.stringify(command)}); true;`);
          });
          stockfish
            .init()
            .then(() => {
              stockfishReady.current = true;
              setStatus({ state: 'ready', kind: 'stockfish', name: stockfish.name });
            })
            .catch((error: Error) => {
              setStatus({ state: 'ready', kind: 'local', name: local.name });
              if (__DEV__) console.warn('[engine] Stockfish handshake failed:', error.message);
            });
          break;

        case 'line':
          stockfish.handleLine(message.payload);
          break;

        case 'error':
          stockfish.fail(message.payload);
          setStatus({ state: 'ready', kind: 'local', name: local.name });
          break;

        case 'log':
          if (__DEV__) console.log('[stockfish]', message.payload);
          break;
      }
    },
    [local.name, stockfish]
  );

  const search = useCallback(
    async (request: SearchRequest): Promise<SearchResult> => {
      const active: ChessEngine = stockfishReady.current ? stockfish : local;
      setStatus((prev) =>
        prev.state === 'ready' ? { state: 'thinking', kind: prev.kind } : prev
      );

      try {
        return await active.search(request);
      } catch (error) {
        if (active === stockfish) {
          // One bad search shouldn't retire Stockfish permanently, but this
          // turn still needs a move.
          if (__DEV__) console.warn('[engine] Stockfish search failed:', (error as Error).message);
          return local.search(request);
        }
        throw error;
      } finally {
        setStatus(
          stockfishReady.current
            ? { state: 'ready', kind: 'stockfish', name: stockfish.name }
            : { state: 'ready', kind: 'local', name: local.name }
        );
      }
    },
    [local, stockfish]
  );

  const stop = useCallback(() => {
    stockfish.stop();
    local.stop();
  }, [local, stockfish]);

  const retry = useCallback(() => {
    setStatus({ state: 'loading' });
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => () => {
    stockfish.dispose();
    local.dispose();
  }, [local, stockfish]);

  const value = useMemo<EngineContextValue>(
    () => ({ status, search, stop, retry }),
    [retry, search, status, stop]
  );

  return (
    <EngineContext.Provider value={value}>
      {children}
      <View style={styles.hidden} pointerEvents="none" testID="stockfish-host">
        <WebView
          key={attempt}
          ref={webViewRef}
          source={{ html, baseUrl: 'https://cdn.jsdelivr.net' }}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          onMessage={onMessage}
          onError={() => {
            stockfish.fail('WebView failed to load');
            setStatus({ state: 'ready', kind: 'local', name: local.name });
          }}
          // The engine host must never steal focus or draw anything.
          androidLayerType="software"
          setSupportMultipleWindows={false}
        />
      </View>
    </EngineContext.Provider>
  );
}

export function useEngine(): EngineContextValue {
  const context = useContext(EngineContext);
  if (!context) throw new Error('useEngine must be used inside <EngineProvider>');
  return context;
}

const styles = StyleSheet.create({
  // 1×1 rather than 0×0: some Android WebView builds skip script execution for
  // a view that is never laid out. Invisible either way.
  hidden: {
    position: 'absolute',
    top: -1,
    left: -1,
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
  },
});
