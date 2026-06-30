import { supabase } from "@/lib/supabase";
import type { AsyncStandup, DailyDigest } from "@/lib/types";

export function todayLocalDate(): string {
  // YYYY-MM-DD in the user's local timezone via Intl.
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

export async function getMyEntry(
  workspaceId: string,
  userId: string,
  localDate: string
): Promise<AsyncStandup | null> {
  const { data, error } = await supabase
    .from("async_standup")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .eq("local_date", localDate)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listMyHistory(
  workspaceId: string,
  userId: string
): Promise<AsyncStandup[]> {
  const { data, error } = await supabase
    .from("async_standup")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .order("local_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listTodayEntries(
  workspaceId: string,
  localDate: string
): Promise<AsyncStandup[]> {
  const { data, error } = await supabase
    .from("async_standup")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("local_date", localDate)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function upsertMyEntry(input: {
  workspace_id: string;
  user_id: string;
  local_date: string;
  yesterday: string;
  today: string;
  blockers: string;
}): Promise<AsyncStandup> {
  const { data, error } = await supabase
    .from("async_standup")
    .upsert(
      {
        workspace_id: input.workspace_id,
        user_id: input.user_id,
        local_date: input.local_date,
        yesterday: input.yesterday,
        today: input.today,
        blockers: input.blockers,
      },
      { onConflict: "workspace_id,user_id,local_date" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getDigest(
  workspaceId: string,
  localDate: string
): Promise<DailyDigest | null> {
  const { data, error } = await supabase
    .from("daily_digest")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("local_date", localDate)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function invokeGenerateDigest(
  workspaceId: string,
  localDate: string
): Promise<DailyDigest> {
  const { data, error } = await supabase.functions.invoke<DailyDigest>(
    "generate-digest",
    {
      body: { workspace_id: workspaceId, local_date: localDate },
    }
  );
  if (error) throw error;
  if (!data) {
    throw new Error("generate-digest returned no data");
  }
  return data;
}
