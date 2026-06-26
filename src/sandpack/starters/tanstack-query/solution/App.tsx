import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

// Tiny in-memory cache so multiple hook calls share state like TanStack Query.
type Entry<T> = {
  data?: T;
  error?: unknown;
  promise?: Promise<T>;
  fetchedAt?: number;
};
const cache = new Map<string, Entry<any>>();
const listeners = new Map<string, Set<() => void>>();

function notify(key: string) {
  listeners.get(key)?.forEach((l) => l());
}

function getSnapshot<T>(key: string): Entry<T> {
  return (cache.get(key) ?? {}) as Entry<T>;
}

function subscribe(key: string, listener: () => void) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)?.add(listener);
  return () => listeners.get(key)?.delete(listener);
}

interface Options {
  staleTime?: number;
}

function useFakeQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: Options = {}
) {
  const entry = useSyncExternalStore(
    (l) => subscribe(key, l),
    () => getSnapshot<T>(key),
    () => getSnapshot<T>(key)
  );
  const stale =
    !entry.fetchedAt ||
    Date.now() - entry.fetchedAt > (options.staleTime ?? 0);

  const refetch = useCallback(() => {
    const p = fetcher()
      .then((data) => {
        cache.set(key, { data, fetchedAt: Date.now() });
        notify(key);
        return data;
      })
      .catch((error) => {
        cache.set(key, { ...(cache.get(key) || {}), error });
        notify(key);
        throw error;
      });
    cache.set(key, { ...(cache.get(key) || {}), promise: p });
    notify(key);
    return p;
  }, [key, fetcher]);

  useEffect(() => {
    if (!entry.data && !entry.promise) refetch();
    else if (stale && !entry.promise) refetch();
  }, [entry.data, entry.promise, refetch, stale]);

  return {
    data: entry.data,
    error: entry.error,
    isLoading: !entry.data && !!entry.promise,
    refetch,
  };
}

async function fetchTodos(): Promise<string[]> {
  await new Promise((r) => setTimeout(r, 500));
  return ["Buy groceries", "Write docs", "Ship it", `@${Date.now() % 1000}`];
}

export default function App() {
  const { data, isLoading, refetch } = useFakeQuery("todos", fetchTodos, {
    staleTime: 2000,
  });
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <button onClick={() => refetch()}>Refetch</button>
      {isLoading ? <p>Loading…</p> : null}
      {data ? (
        <ul>
          {data.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
