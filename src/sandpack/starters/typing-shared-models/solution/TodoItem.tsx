import type { Todo } from "./types";

export function TodoItem({ todo }: { todo: Todo }) {
  return (
    <li style={{ textDecoration: todo.done ? "line-through" : "none" }}>
      {todo.label}
    </li>
  );
}
