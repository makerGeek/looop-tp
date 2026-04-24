// TODO: build a module-level store + a `useTodos` hook that returns
// { todos, add, toggle }. All consumers must share the same data.
// See the solution for a useSyncExternalStore implementation.

export function useTodos() {
  return {
    todos: [] as { id: string; label: string; done: boolean }[],
    add: (_label: string) => {},
    toggle: (_id: string) => {},
  };
}
