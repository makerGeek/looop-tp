import { useState } from "react";

type Status = "idle" | "loading" | "error" | "ready";

// TODO: render <Loading /> when loading and <ErrorPanel /> when error.
function Loading() {
  return <p>⏳ Streaming from server…</p>;
}
function ErrorPanel({ reset }: { reset: () => void }) {
  return (
    <div>
      <p style={{ color: "crimson" }}>Something went wrong.</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}

export default function App() {
  const [status, setStatus] = useState<Status>("idle");
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <nav style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => setStatus("loading")}>Load</button>
        <button onClick={() => setStatus("ready")}>Ready</button>
        <button onClick={() => setStatus("error")}>Error</button>
      </nav>
      <main>{status === "ready" ? <p>✅ Ready.</p> : null}</main>
    </div>
  );
}
