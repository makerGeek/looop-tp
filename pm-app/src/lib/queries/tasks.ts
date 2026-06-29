import { supabase } from "@/lib/supabase";
import type { Task, TaskStatus } from "@/lib/types";

export async function listTasksForProject(
  projectId: string
): Promise<Task[]> {
  const { data, error } = await supabase
    .from("task")
    .select("*")
    .eq("project_id", projectId)
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listInboxTasks(userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from("task")
    .select("*")
    .eq("assignee_id", userId)
    .neq("status", "done")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getTask(id: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from("task")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createTask(input: {
  project_id: string;
  title: string;
  motivation: string;
  status?: TaskStatus;
}): Promise<Task> {
  const { data, error } = await supabase
    .from("task")
    .insert({
      project_id: input.project_id,
      title: input.title,
      motivation: input.motivation,
      status: input.status ?? "backlog",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTask(
  id: string,
  patch: Partial<
    Pick<
      Task,
      "title" | "motivation" | "description" | "status" | "assignee_id" | "due_at" | "position"
    >
  >
): Promise<Task> {
  const { data, error } = await supabase
    .from("task")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("task").delete().eq("id", id);
  if (error) throw error;
}
