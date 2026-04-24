import { useOptimistic, useState, useTransition } from "react";

interface Msg {
  id: string;
  text: string;
  pending?: boolean;
}

async function sendMessage(text: string): Promise<Msg> {
  await new Promise((r) => setTimeout(r, 800));
  return { id: crypto.randomUUID(), text };
}

export default function App() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const [optimistic, addOptimistic] = useOptimistic<Msg[], Msg>(
    messages,
    (curr, next) => [...curr, { ...next, pending: true }]
  );

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", display: "grid", gap: 8 }}>
      <ul>
        {optimistic.map((m) => (
          <li key={m.id} style={{ opacity: m.pending ? 0.5 : 1 }}>
            {m.text} {m.pending ? "…" : ""}
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const text = draft.trim();
          if (!text) return;
          setDraft("");
          startTransition(async () => {
            addOptimistic({ id: "optimistic", text });
            const result = await sendMessage(text);
            setMessages((prev) => [...prev, result]);
          });
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type…"
        />
        <button disabled={!draft.trim() || pending}>Send</button>
      </form>
    </div>
  );
}
