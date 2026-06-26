import { useState } from "react";

// TODO: implement useLocalStorage<T>(key, initial)
// TODO: implement useToggle(initial = false)

export default function App() {
  const [dark, setDark] = useState(false);
  return (
    <div
      style={{
        padding: 24,
        fontFamily: "system-ui",
        background: dark ? "#0f172a" : "white",
        color: dark ? "white" : "#0f172a",
        minHeight: "100vh",
      }}
    >
      <button onClick={() => setDark((d) => !d)}>
        {dark ? "☀️ Light" : "🌙 Dark"}
      </button>
    </div>
  );
}
