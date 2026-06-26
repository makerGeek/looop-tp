import { useState } from "react";

interface Todo {
  id: string;
  label: string;
  done: boolean;
}

const seed: Todo[] = [
  { id: "a", label: "Learn React 19", done: true },
  { id: "b", label: "Build a Codecademy clone", done: false },
  { id: "c", label: "Ship to production", done: false },
];

export default function App() {
  const [query, setQuery] = useState("");
  const [hideDone, setHideDone] = useState(false);
  const filtered = seed.filter((t) => {
    if (hideDone && t.done) return false;
    return t.label.toLowerCase().includes(query.toLowerCase());
  });
  return (
    <div style={{ padding: 24, fontFamily: "system-ui", display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          placeholder="Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label>
          <input
            type="checkbox"
            checked={hideDone}
            onChange={(e) => setHideDone(e.target.checked)}
          />{" "}
          hide completed
        </label>
      </div>
      <ul>
        {filtered.map((t) => (
          <li key={t.id}>
            <span style={{ textDecoration: t.done ? "line-through" : "none" }}>
              {t.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
