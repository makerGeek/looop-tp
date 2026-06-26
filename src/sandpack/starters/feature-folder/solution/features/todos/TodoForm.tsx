import { useState } from "react";
import { useTodos } from "./useTodos";

export function TodoForm() {
  const [draft, setDraft] = useState("");
  const { add } = useTodos();
  return (
    <form
      style={{ display: "flex", gap: 8 }}
      onSubmit={(e) => {
        e.preventDefault();
        add(draft);
        setDraft("");
      }}
    >
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="What needs doing?"
        style={{ flex: 1 }}
      />
      <button type="submit">Add</button>
    </form>
  );
}
