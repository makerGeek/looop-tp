import { createContext, use, useState, useMemo } from "react";

interface ThemeCtx {
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
}

const ThemeContext = createContext<ThemeCtx>({
  theme: "light",
  setTheme: () => {},
});

function DeepChild() {
  const { theme, setTheme } = use(ThemeContext);
  return (
    <div>
      <p>theme: {theme}</p>
      <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
        toggle
      </button>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  return (
    <ThemeContext.Provider value={value}>
      <div
        style={{
          padding: 24,
          fontFamily: "system-ui",
          background: theme === "dark" ? "#0f172a" : "white",
          color: theme === "dark" ? "white" : "#0f172a",
          minHeight: "100vh",
        }}
      >
        <DeepChild />
      </div>
    </ThemeContext.Provider>
  );
}
