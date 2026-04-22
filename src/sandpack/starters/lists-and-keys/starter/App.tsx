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
  // TODO: add a query state and derive a filtered list

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <input placeholder="Search…" />
      {/* TODO: render filtered seed as <ul> */}
      <ul>
        {seed.map((t, i) => (
          <li key={i}>{t.label}</li>
        ))}
      </ul>
    </div>
  );
}
