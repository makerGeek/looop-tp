import { supabase } from "@/lib/supabase";
import type { Comment } from "@/lib/types";

export async function listComments(taskId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from("comment")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createComment(input: {
  task_id: string;
  body: string;
}): Promise<Comment> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("comment")
    .insert({
      task_id: input.task_id,
      author_id: user.user.id,
      body: input.body,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
