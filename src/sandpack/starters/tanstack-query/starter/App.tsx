import { useEffect, useState } from "react";

async function fetchTodos(): Promise<string[]> {
  await new Promise((r) => setTimeout(r, 500));
  return ["Buy groceries", "Write docs", "Ship it"];
}

// TODO: implement useFakeQuery<T>(key, fetcher) that caches and tracks state.

export default function App() {
  const [todos, setTodos] = useState<string[] | null>(null);
  useEffect(() => {
    fetchTodos().then(setTodos);
  }, []);
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      {todos ? (
        <ul>
          {todos.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      ) : (
        <p>Loading…</p>
      )}
    </div>
  );
}
