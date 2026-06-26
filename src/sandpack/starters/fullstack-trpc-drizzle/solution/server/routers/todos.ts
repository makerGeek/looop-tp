// server/routers/todos.ts — tRPC router.
import { initTRPC } from "@trpc/server";
import { z } from "zod";
import { db } from "../db";
import { todos } from "../../db/schema";
import { eq } from "drizzle-orm";

const t = initTRPC.create();

export const todoRouter = t.router({
  list: t.procedure.query(async () => {
    return db.select().from(todos).orderBy(todos.createdAt);
  }),

  add: t.procedure
    .input(z.object({ title: z.string().min(1).max(200) }))
    .mutation(async ({ input }) => {
      const [row] = await db
        .insert(todos)
        .values({ title: input.title })
        .returning();
      return row;
    }),

  toggle: t.procedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const [existing] = await db
        .select()
        .from(todos)
        .where(eq(todos.id, input.id));
      if (!existing) throw new Error("not found");
      await db
        .update(todos)
        .set({ done: !existing.done })
        .where(eq(todos.id, input.id));
      return { ok: true };
    }),
});

export type TodoRouter = typeof todoRouter;
