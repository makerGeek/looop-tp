import { useState } from "react";

// TODO: define a discriminated union Fetch<T>

export default function App() {
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => setStatus("idle")}>idle</button>
        <button onClick={() => setStatus("loading")}>loading</button>
        <button onClick={() => setStatus("error")}>error</button>
        <button onClick={() => setStatus("success")}>success</button>
      </div>
      {/* TODO: switch on status and render different UI */}
    </div>
  );
}
