import { useState } from "react";

export default function App() {
  // TODO: track name and message with useState

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", display: "grid", gap: 12, maxWidth: 480 }}>
      <input placeholder="Your name" />
      <textarea placeholder="Message" rows={3} />
      <button>Clear</button>
      <pre>{/* TODO: JSON.stringify the state */}</pre>
    </div>
  );
}
