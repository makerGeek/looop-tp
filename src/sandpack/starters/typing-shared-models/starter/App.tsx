// TODO: extract `Todo` into ./types.ts and reuse it in TodoItem.tsx + utils.ts.

interface Todo {
  id: string;
  label: string;
  done: boolean;
}

const seed: Todo[] = [
  { id: "a", label: "Learn React", done: true },
  { id: "b", label: "Refactor types", done: false },
];

function summarize(todos: Todo[]): string {
  const done = todos.filter((t) => t.done).length;
  return `${done} of ${todos.length} done`;
}

function TodoItem({ todo }: { todo: Todo }) {
  return (
    <li style={{ textDecoration: todo.done ? "line-through" : "none" }}>
      {todo.label}
    </li>
  );
}

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
