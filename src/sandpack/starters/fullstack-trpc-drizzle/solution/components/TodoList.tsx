// components/TodoList.tsx — client using typed tRPC + TanStack Query.
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";

export function TodoList() {
  const [title, setTitle] = useState("");
  const utils = trpc.useUtils();
  const list = trpc.todo.list.useQuery();
  const add = trpc.todo.add.useMutation({
    onSuccess: () => utils.todo.list.invalidate(),
  });
  const toggle = trpc.todo.toggle.useMutation({
    onSuccess: () => utils.todo.list.invalidate(),
  });

  return (
    <section>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim()) {
            add.mutate({ title: title.trim() });
            setTitle("");
          }
        }}
      >
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
        <button disabled={add.isPending}>Add</button>
      </form>
      {list.isLoading ? <p>Loading…</p> : null}
      <ul>
        {list.data?.map((t) => (
          <li key={t.id}>
            <label>
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => toggle.mutate({ id: t.id })}
              />{" "}
              {t.title}
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
