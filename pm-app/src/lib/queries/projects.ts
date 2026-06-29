import { supabase } from "@/lib/supabase";
import type { Project } from "@/lib/types";

export async function listProjects(workspaceId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from("project")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getProjectBySlug(
  workspaceId: string,
  slug: string
): Promise<Project | null> {
  const { data, error } = await supabase
    .from("project")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createProject(input: {
  workspace_id: string;
  name: string;
}): Promise<Project> {
  const slug = slugify(input.name);
  const { data, error } = await supabase
    .from("project")
    .insert({
      workspace_id: input.workspace_id,
      name: input.name,
      slug,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const tail = Math.random().toString(36).slice(2, 6);
  return base ? `${base}-${tail}` : tail;
}
