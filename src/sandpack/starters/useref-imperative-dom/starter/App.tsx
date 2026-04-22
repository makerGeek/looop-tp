import { useRef } from "react";

export default function App() {
  // TODO: create inputRef and boxRef

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", display: "grid", gap: 12 }}>
      <input placeholder="Focus me" />
      <div style={{ width: 160, height: 64, background: "lightblue" }} />
      <div style={{ display: "flex", gap: 8 }}>
        <button>Focus input</button>
        <button>Measure box</button>
      </div>
    </div>
  );
}
