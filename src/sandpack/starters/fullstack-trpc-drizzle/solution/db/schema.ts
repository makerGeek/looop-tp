// db/schema.ts — Drizzle SQLite schema.
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const todos = sqliteTable("todos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  done: integer("done", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull().default(Date.now()),
});

export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;
