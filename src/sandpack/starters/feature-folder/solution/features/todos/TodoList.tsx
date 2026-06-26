import { useTodos } from "./useTodos";

export function TodoList() {
  const { todos, toggle } = useTodos();
  if (todos.length === 0)
    return <p style={{ color: "#64748b", fontSize: 14 }}>No todos yet.</p>;
  return (
    <ul style={{ paddingLeft: 16 }}>
      {todos.map((t) => (
        <li key={t.id}>
          <label>
            <input
              type="checkbox"
              checked={t.done}
              onChange={() => toggle(t.id)}
            />{" "}
            <span style={{ textDecoration: t.done ? "line-through" : "none" }}>
              {t.label}
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}
