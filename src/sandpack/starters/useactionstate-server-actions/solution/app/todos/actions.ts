// app/todos/actions.ts — Runs on the server.
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

const schema = z.object({
  title: z.string().min(1, "Title is required").max(80),
});

type Prev = { error?: string; ok?: boolean };

export async function createTodo(_prev: Prev, formData: FormData): Promise<Prev> {
  const parsed = schema.safeParse({ title: formData.get("title") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  await db.todo.create({ data: { title: parsed.data.title } });
  revalidatePath("/todos");
  return { ok: true };
}

// stand-in for a real ORM in this read-only sample
declare const db: {
  todo: { create: (args: { data: { title: string } }) => Promise<void> };
};
