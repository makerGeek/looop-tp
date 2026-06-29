import { supabase } from "@/lib/supabase";
import type { Attachment } from "@/lib/types";

export async function listAttachments(taskId: string): Promise<Attachment[]> {
  const { data, error } = await supabase
    .from("attachment")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function uploadAttachment(input: {
  workspace_id: string;
  task_id: string;
  file: File;
}): Promise<Attachment> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Not signed in");
  const ext = input.file.name.split(".").pop() ?? "bin";
  const objectName = `${input.workspace_id}/${input.task_id}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("attachments")
    .upload(objectName, input.file, {
      contentType: input.file.type || "application/octet-stream",
    });
  if (uploadErr) throw uploadErr;

  const { data, error } = await supabase
    .from("attachment")
    .insert({
      task_id: input.task_id,
      storage_path: objectName,
      filename: input.file.name,
      mime: input.file.type || "application/octet-stream",
      size_bytes: input.file.size,
      uploaded_by: user.user.id,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAttachment(att: Attachment): Promise<void> {
  await supabase.storage.from("attachments").remove([att.storage_path]);
  const { error } = await supabase
    .from("attachment")
    .delete()
    .eq("id", att.id);
  if (error) throw error;
}

export function attachmentSignedUrl(
  storagePath: string,
  ttlSeconds = 3600
): Promise<string | null> {
  return supabase.storage
    .from("attachments")
    .createSignedUrl(storagePath, ttlSeconds)
    .then(({ data }) => data?.signedUrl ?? null);
}
