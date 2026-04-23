import type { Todo } from "./types";
import { summarize } from "./utils";
import { TodoItem } from "./TodoItem";

const seed: Todo[] = [
  { id: "a", label: "Learn React", done: true },
  { id: "b", label: "Refactor types", done: false },
];

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <p>{summarize(seed)}</p>
      <ul>
        {seed.map((t) => (
          <TodoItem key={t.id} todo={t} />
        ))}
      </ul>
    </div>
  );
}
