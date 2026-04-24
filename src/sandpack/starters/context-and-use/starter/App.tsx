import { createContext } from "react";

// TODO: create ThemeContext and read it inside DeepChild with use().

const ThemeContext = createContext<"light" | "dark">("light");

function DeepChild() {
  return <p>theme: ???</p>;
}

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <DeepChild />
    </div>
  );
}
