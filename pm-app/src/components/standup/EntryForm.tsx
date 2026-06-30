import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { Loader2, Pencil } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  getMyEntry,
  todayLocalDate,
  upsertMyEntry,
} from "@/lib/queries/standup";
import { useSession } from "@/hooks/use-session";
import { useWorkspace } from "@/hooks/use-workspace";
import type { AsyncStandup } from "@/lib/types";
import { cn } from "@/lib/cn";

interface Props {
  onSubmitted?: (entry: AsyncStandup) => void;
}

function formatSavedAt(updatedAt: string): string {
  return new Date(updatedAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function EntryForm({ onSubmitted }: Props) {
  const { session } = useSession();
  const { workspace } = useWorkspace();
  const userId = session?.user?.id ?? null;
  const workspaceId = workspace?.id ?? null;

  const localDate = useMemo(() => todayLocalDate(), []);

  const [yesterday, setYesterday] = useState("");
  const [today, setToday] = useState("");
  const [blockers, setBlockers] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingEntry, setExistingEntry] = useState<AsyncStandup | null>(null);
  // After load, if an entry exists default to read-only ("submitted") view.
  // If the user clicks Edit, flip to editing. New entries start editing.
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!workspaceId || !userId) return;
    let cancelled = false;
    setLoading(true);
    getMyEntry(workspaceId, userId, localDate)
      .then((entry) => {
        if (cancelled) return;
        setExistingEntry(entry);
        if (entry) {
          setYesterday(entry.yesterday);
          setToday(entry.today);
          setBlockers(entry.blockers);
          setEditing(false);
        } else {
          setEditing(true);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(String(e?.message ?? e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId, userId, localDate]);

  const canSubmit =
    !!workspaceId &&
    !!userId &&
    !saving &&
    (yesterday.trim().length > 0 ||
      today.trim().length > 0 ||
      blockers.trim().length > 0);

  const isUpdate = existingEntry !== null;

  async function onSubmit() {
    if (!canSubmit || !workspaceId || !userId) return;
    setSaving(true);
    setError(null);
    try {
      const entry = await upsertMyEntry({
        workspace_id: workspaceId,
        user_id: userId,
        local_date: localDate,
        yesterday,
        today,
        blockers,
      });
      setExistingEntry(entry);
      setEditing(false);
      onSubmitted?.(entry);
    } catch (e) {
      setError("Couldn't save your standup. Try again.");
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (canSubmit) {
        void onSubmit();
      }
    }
  }

  function onEdit() {
    if (!existingEntry) return;
    // Re-seed the inputs from the persisted entry (in case state drifted).
    setYesterday(existingEntry.yesterday);
    setToday(existingEntry.today);
    setBlockers(existingEntry.blockers);
    setError(null);
    setEditing(true);
  }

  const dateHeader = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString([], {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }, []);

  const showSubmitted = !editing && existingEntry !== null;
  const savedAt = existingEntry ? formatSavedAt(existingEntry.updated_at) : null;

  return (
    <div className="rounded-lg border border-border bg-card/50 p-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold">
          Your standup{" "}
          <span className="font-normal text-muted-foreground">
            &middot; <em className="not-italic">{dateHeader}</em>
          </span>
        </h2>
        {showSubmitted ? (
          <div className="flex items-center gap-3">
            {savedAt ? (
              <span className="text-xs text-muted-foreground">
                Saved at {savedAt}
              </span>
            ) : null}
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          </div>
        ) : null}
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
        </div>
      ) : showSubmitted ? (
        <div className="space-y-4">
          <ReadOnlySection label="Yesterday" body={existingEntry!.yesterday} />
          <ReadOnlySection label="Today" body={existingEntry!.today} />
          <ReadOnlySection label="Blockers" body={existingEntry!.blockers} />
        </div>
      ) : (
        <div className="space-y-4">
          <Field
            label="Yesterday"
            value={yesterday}
            onChange={setYesterday}
            onKeyDown={onKeyDown}
            placeholder="What did you ship or move forward?"
            disabled={saving}
          />
          <Field
            label="Today"
            value={today}
            onChange={setToday}
            onKeyDown={onKeyDown}
            placeholder="What are you focused on?"
            disabled={saving}
          />
          <Field
            label="Blockers"
            value={blockers}
            onChange={setBlockers}
            onKeyDown={onKeyDown}
            placeholder="Anything in your way? (Optional)"
            disabled={saving}
          />

          <p className="text-xs text-muted-foreground">
            Markdown supported. Cmd + Enter to submit.
          </p>

          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {error ? (
                <span className="text-destructive">{error}</span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onSubmit}
              disabled={!canSubmit}
              title={
                canSubmit ? undefined : "Fill in at least one field to submit."
              }
              className={cn(
                "inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
                "hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : isUpdate ? (
                "Update"
              ) : (
                "Submit"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  onKeyDown,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        rows={3}
        disabled={disabled}
        className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-60"
      />
    </label>
  );
}

function ReadOnlySection({ label, body }: { label: string; body: string }) {
  const trimmed = body.trim();
  return (
    <section>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </h3>
      {trimmed ? (
        <div className="prose prose-invert prose-sm max-w-none rounded-md border border-border/60 bg-background/50 px-3 py-2">
          <Markdown remarkPlugins={[remarkGfm]}>{body}</Markdown>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">—</p>
      )}
    </section>
  );
}
