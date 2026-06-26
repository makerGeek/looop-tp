// TODO: import useState from "react"

export default function App() {
  // TODO: create [count, setCount] with initial 0
  const count = 0;
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 48 }}>{count}</h1>
      <div style={{ display: "flex", gap: 8 }}>
        {/* TODO: wire three buttons: - + reset */}
        <button>-</button>
        <button>+</button>
        <button>reset</button>
      </div>
    </div>
  );
}
