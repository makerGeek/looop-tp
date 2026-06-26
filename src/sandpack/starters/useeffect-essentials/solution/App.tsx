import { useState, useEffect } from "react";

export default function App() {
  const [now, setNow] = useState(new Date());
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [paused]);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <div style={{ fontSize: 48, fontVariantNumeric: "tabular-nums" }}>
        {now.toLocaleTimeString()}
      </div>
      <button onClick={() => setPaused((p) => !p)} style={{ marginTop: 12 }}>
        {paused ? "Resume" : "Pause"}
      </button>
    </div>
  );
}
