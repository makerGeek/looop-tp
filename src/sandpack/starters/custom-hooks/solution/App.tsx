import { useCallback, useEffect, useState } from "react";

function useLocalStorage<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }, [key, value]);
  return [value, setValue];
}

function useToggle(initial = false): [boolean, () => void] {
  const [on, setOn] = useState(initial);
  const toggle = useCallback(() => setOn((o) => !o), []);
  return [on, toggle];
}

export default function App() {
  const [dark, setDark] = useLocalStorage("demo:dark", false);
  const [showHelp, toggleHelp] = useToggle(false);
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
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setDark(!dark)}>
          {dark ? "☀️ Light" : "🌙 Dark"}
        </button>
        <button onClick={toggleHelp}>
          {showHelp ? "Hide help" : "Show help"}
        </button>
      </div>
      {showHelp ? (
        <p style={{ fontSize: 13, marginTop: 12 }}>
          Preference persists across reloads via localStorage.
        </p>
      ) : null}
    </div>
  );
}
