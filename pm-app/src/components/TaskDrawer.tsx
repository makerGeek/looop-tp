import { useEffect, useMemo, useState, type DragEvent } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { X, Paperclip, Send, Trash2, Loader2 } from "lucide-react";
import {
  TASK_STATUSES,
  TASK_STATUS_LABEL,
  type Task,
  type TaskStatus,
} from "@/lib/types";
import {
  getTask,
  updateTask,
  deleteTask,
} from "@/lib/queries/tasks";
import { listComments, createComment } from "@/lib/queries/comments";
import {
  listAttachments,
  uploadAttachment,
  deleteAttachment,
  attachmentSignedUrl,
} from "@/lib/queries/attachments";
import type { Comment, Attachment } from "@/lib/types";
import { cn } from "@/lib/cn";

interface Props {
  taskId: string | null;
  workspaceId: string;
  onClose: () => void;
  onChanged?: () => void;
}

export function TaskDrawer({ taskId, workspaceId, onClose, onChanged }: Props) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [draft, setDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Local edits batched, persisted on blur.
  const [titleDraft, setTitleDraft] = useState("");
  const [motivationDraft, setMotivationDraft] = useState("");
  const [descDraft, setDescDraft] = useState("");

  useEffect(() => {
    if (!taskId) {
      setTask(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getTask(taskId),
      listComments(taskId),
      listAttachments(taskId),
    ])
      .then(([t, c, a]) => {
        if (cancelled) return;
        setTask(t);
        setComments(c);
        setAttachments(a);
        setTitleDraft(t?.title ?? "");
        setMotivationDraft(t?.motivation ?? "");
        setDescDraft(t?.description ?? "");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  if (!taskId) return null;

  async function persist(patch: Parameters<typeof updateTask>[1]) {
    if (!task) return;
    const updated = await updateTask(task.id, patch);
    setTask(updated);
    onChanged?.();
  }

  async function onUploadFiles(files: FileList | File[]) {
    if (!task) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const att = await uploadAttachment({
          workspace_id: workspaceId,
          task_id: task.id,
          file,
        });
        setAttachments((prev) => [att, ...prev]);
      }
    } finally {
      setUploading(false);
    }
  }

  async function onDeleteAttachment(att: Attachment) {
    await deleteAttachment(att);
    setAttachments((prev) => prev.filter((a) => a.id !== att.id));
  }

  async function onAddComment() {
    if (!task || !draft.trim()) return;
    const c = await createComment({ task_id: task.id, body: draft.trim() });
    setComments((prev) => [...prev, c]);
    setDraft("");
  }

  async function onDeleteTask() {
    if (!task) return;
    if (!window.confirm("Delete this task? This can't be undone.")) return;
    await deleteTask(task.id);
    onChanged?.();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex"
      role="dialog"
      aria-modal="true"
      data-testid="task-drawer"
    >
      <div
        className="flex-1 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cn(
          "flex h-full w-full max-w-2xl flex-col border-l border-border bg-card shadow-2xl",
          "transition-transform"
        )}
        onDragOver={(e: DragEvent) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={async (e: DragEvent) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length > 0) {
            await onUploadFiles(e.dataTransfer.files);
          }
        }}
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="text-xs text-muted-foreground">
            {loading ? "Loading…" : task ? "Task" : "Not found"}
          </div>
          <div className="flex items-center gap-2">
            {task ? (
              <button
                type="button"
                onClick={onDeleteTask}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                aria-label="Delete task"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {task ? (
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() =>
                titleDraft !== task.title && persist({ title: titleDraft })
              }
              placeholder="Task title"
              className="w-full bg-transparent text-xl font-semibold outline-none"
            />

            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Status</span>
                <select
                  value={task.status}
                  onChange={(e) =>
                    persist({ status: e.target.value as TaskStatus })
                  }
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                >
                  {TASK_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {TASK_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Due</span>
                <input
                  type="date"
                  value={task.due_at ? task.due_at.slice(0, 10) : ""}
                  onChange={(e) =>
                    persist({
                      due_at: e.target.value
                        ? new Date(e.target.value).toISOString()
                        : null,
                    })
                  }
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                />
              </label>
            </div>

            <Section title="Why">
              <textarea
                value={motivationDraft}
                onChange={(e) => setMotivationDraft(e.target.value)}
                onBlur={() =>
                  motivationDraft !== task.motivation &&
                  persist({ motivation: motivationDraft })
                }
                placeholder="Why does this matter? Required."
                rows={2}
                className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </Section>

            <Section title="Description">
              <textarea
                value={descDraft}
                onChange={(e) => setDescDraft(e.target.value)}
                onBlur={() =>
                  descDraft !== (task.description ?? "") &&
                  persist({ description: descDraft })
                }
                placeholder="Markdown supported. Drag files anywhere on this panel to attach."
                rows={6}
                className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
              />
              {descDraft.trim() ? (
                <div className="prose prose-invert prose-sm mt-3 max-w-none rounded-md border border-border/60 bg-background/50 px-3 py-2">
                  <Markdown remarkPlugins={[remarkGfm]}>{descDraft}</Markdown>
                </div>
              ) : null}
            </Section>

            <Section
              title={`Attachments (${attachments.length})`}
              right={
                <label className="cursor-pointer text-xs text-primary hover:underline">
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) =>
                      e.target.files && onUploadFiles(e.target.files)
                    }
                  />
                  <span className="inline-flex items-center gap-1">
                    <Paperclip className="h-3.5 w-3.5" />
                    Upload
                  </span>
                </label>
              }
            >
              {dragOver ? (
                <div className="rounded-md border-2 border-dashed border-primary bg-primary/10 px-4 py-6 text-center text-sm text-primary">
                  Drop to upload
                </div>
              ) : null}
              {uploading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> uploading…
                </div>
              ) : null}
              <div className="mt-2 grid grid-cols-2 gap-2">
                {attachments.map((a) => (
                  <AttachmentTile
                    key={a.id}
                    att={a}
                    onDelete={() => onDeleteAttachment(a)}
                  />
                ))}
              </div>
              {attachments.length === 0 && !uploading && !dragOver ? (
                <p className="text-xs text-muted-foreground">
                  No attachments yet — drag files onto this panel or click Upload.
                </p>
              ) : null}
            </Section>

            <Section title={`Comments (${comments.length})`}>
              <div className="space-y-3">
                {comments.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-md border border-border bg-background/50 px-3 py-2"
                  >
                    <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {new Date(c.created_at).toLocaleString()}
                    </div>
                    <div className="prose prose-invert prose-sm max-w-none">
                      <Markdown remarkPlugins={[remarkGfm]}>{c.body}</Markdown>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a comment… (markdown)"
                  rows={2}
                  className="flex-1 resize-y rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={onAddComment}
                  disabled={!draft.trim()}
                  className="self-end rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </Section>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        {right}
      </div>
      {children}
    </section>
  );
}

function AttachmentTile({
  att,
  onDelete,
}: {
  att: Attachment;
  onDelete: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    attachmentSignedUrl(att.storage_path).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [att.storage_path]);

  const isImage = att.mime.startsWith("image/");
  const isVideo = att.mime.startsWith("video/");
  const isPdf = att.mime === "application/pdf";

  return (
    <div className="group relative overflow-hidden rounded-md border border-border bg-background/40">
      {isImage && url ? (
        <a href={url} target="_blank" rel="noreferrer">
          <img
            src={url}
            alt={att.filename}
            className="block aspect-video w-full object-cover"
          />
        </a>
      ) : isVideo && url ? (
        <video src={url} controls className="block aspect-video w-full" />
      ) : isPdf && url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="block aspect-video w-full bg-muted text-center text-xs leading-[10rem] text-muted-foreground hover:text-foreground"
        >
          📄 PDF
        </a>
      ) : (
        <a
          href={url ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="block aspect-video w-full bg-muted text-center text-xs leading-[10rem] text-muted-foreground hover:text-foreground"
        >
          📎 File
        </a>
      )}
      <div className="flex items-center justify-between gap-2 px-2 py-1.5 text-[10px] text-muted-foreground">
        <span className="truncate" title={att.filename}>
          {att.filename}
        </span>
        <button
          type="button"
          onClick={onDelete}
          className="opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
          aria-label="Delete attachment"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
