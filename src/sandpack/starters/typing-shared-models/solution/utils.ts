import type { Todo } from "./types";

export function summarize(todos: Todo[]): string {
  const done = todos.filter((t) => t.done).length;
  return `${done} of ${todos.length} done`;
}
