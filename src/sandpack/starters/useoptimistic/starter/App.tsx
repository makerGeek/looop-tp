import { useState, useTransition } from "react";

async function sendMessage(text: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 800));
  return text;
}

export default function App() {
  const [messages, setMessages] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  // TODO: use useOptimistic to show the draft before it arrives.

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", display: "grid", gap: 8 }}>
      <ul>
        {messages.map((m, i) => (
          <li key={i}>{m}</li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const result = await sendMessage(draft);
            setMessages((prev) => [...prev, result]);
            setDraft("");
          });
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type…"
          disabled={pending}
        />
        <button disabled={!draft.trim()}>Send</button>
      </form>
    </div>
  );
}
