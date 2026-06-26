import { useSyncExternalStore } from "react";
import type { Todo } from "./types";

// Module-level state — every useTodos consumer reads the same array, so
// TodoForm and TodoList stay in sync without prop drilling.
let todos: Todo[] = [];
const listeners = new Set<() => void>();
let counter = 0;

function emit() {
  for (const l of listeners) l();
}

const api = {
  add(label: string) {
    if (!label.trim()) return;
    counter += 1;
    todos = [...todos, { id: String(counter), label, done: false }];
    emit();
  },
  toggle(id: string) {
    todos = todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
    emit();
  },
};

export function useTodos() {
  const snapshot = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => todos,
    () => todos
  );
  return { todos: snapshot, add: api.add, toggle: api.toggle };
}
