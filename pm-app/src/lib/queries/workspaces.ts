import { supabase } from "@/lib/supabase";
import type { Workspace, WorkspaceMember } from "@/lib/types";

export async function listMyWorkspaces(): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from("workspace")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getOrCreateDefaultWorkspace(
  userId: string,
  email: string
): Promise<Workspace> {
  // If the user already belongs to a workspace, return the first one.
  const existing = await listMyWorkspaces();
  if (existing.length > 0) return existing[0]!;

  // Otherwise create a personal workspace and add this user as owner.
  const baseSlug =
    (email.split("@")[0] ?? "me").toLowerCase().replace(/[^a-z0-9]/g, "-") ||
    "me";
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  const { data: ws, error } = await supabase
    .from("workspace")
    .insert({ name: `${email}'s workspace`, slug })
    .select()
    .single();
  if (error) throw error;

  const { error: memErr } = await supabase
    .from("workspace_member")
    .insert({ workspace_id: ws.id, user_id: userId, role: "owner" });
  if (memErr) throw memErr;

  return ws;
}

export async function listMembers(
  workspaceId: string
): Promise<WorkspaceMember[]> {
  const { data, error } = await supabase
    .from("workspace_member")
    .select("*")
    .eq("workspace_id", workspaceId);
  if (error) throw error;
  return data ?? [];
}
