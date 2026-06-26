// app/todos/NewTodoForm.tsx — Client component.
"use client";

import { useActionState } from "react";
import { createTodo } from "./actions";

export function NewTodoForm() {
  const [state, formAction, pending] = useActionState(createTodo, {});
  return (
    <form action={formAction}>
      <input name="title" placeholder="What needs to be done?" required />
      <button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Add"}
      </button>
      {state.error ? (
        <p role="alert" style={{ color: "crimson" }}>
          {state.error}
        </p>
      ) : null}
      {state.ok ? <p>✅ Added.</p> : null}
    </form>
  );
}
