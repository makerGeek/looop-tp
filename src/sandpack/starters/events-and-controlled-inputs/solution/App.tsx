import { useState } from "react";

export default function App() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const canClear = name.length > 0 || message.length > 0;

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", display: "grid", gap: 12, maxWidth: 480 }}>
      <input
        placeholder="Your name"
        value={name}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setName(e.target.value)
        }
      />
      <textarea
        placeholder="Message"
        rows={3}
        value={message}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
          setMessage(e.target.value)
        }
      />
      <button
        disabled={!canClear}
        onClick={() => {
          setName("");
          setMessage("");
        }}
      >
        Clear
      </button>
      <pre style={{ background: "#f5f5f5", padding: 12 }}>
        {JSON.stringify({ name, message }, null, 2)}
      </pre>
    </div>
  );
}
