import { useState } from "react";

export default function App() {
  const [count, setCount] = useState(0);
  const [step, setStep] = useState(1);
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 48 }}>{count}</h1>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={() => setCount((c) => c - step)}>-</button>
        <button onClick={() => setCount((c) => c + step)}>+</button>
        <button onClick={() => setCount(0)}>reset</button>
        <label style={{ marginLeft: 12, fontSize: 14 }}>
          step{" "}
          <input
            type="number"
            value={step}
            min={1}
            onChange={(e) => setStep(Number(e.target.value) || 1)}
            style={{ width: 48 }}
          />
        </label>
      </div>
    </div>
  );
}
