import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { listTodayEntries, todayLocalDate } from "@/lib/queries/standup";
import { listMembers } from "@/lib/queries/workspaces";
import { useSession } from "@/hooks/use-session";
import { useWorkspace } from "@/hooks/use-workspace";
import type { WorkspaceMember } from "@/lib/types";
import { cn } from "@/lib/cn";

interface Props {
  /**
   * Any value that changes triggers a re-fetch. Parent (DailySync) bumps it
   * after EntryForm reports a successful submit so the strip reflects the
   * new state without a full page reload (AC 5.2).
   */
  refreshKey?: number;
}

interface Row {
  userId: string;
  initials: string;
  label: string; // human-ish label used in aria-label and tooltip
  submitted: boolean;
}

function initialsFromString(s: string): string {
  const cleaned = s.replace(/[^a-zA-Z0-9]/g, "");
  return (cleaned.slice(0, 2) || "??").toUpperCase();
}

export function CoverageStrip({ refreshKey }: Props) {
  const { session } = useSession();
  const { workspace } = useWorkspace();
  const userId = session?.user?.id ?? null;
  const userEmail = session?.user?.email ?? null;
  const workspaceId = workspace?.id ?? null;

  const localDate = useMemo(() => todayLocalDate(), []);

  const [members, setMembers] = useState<WorkspaceMember[] | null>(null);
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      listMembers(workspaceId),
      listTodayEntries(workspaceId, localDate),
    ])
      .then(([ms, entries]) => {
        if (cancelled) return;
        setMembers(ms);
        setSubmittedIds(new Set(entries.map((e) => e.user_id)));
      })
      .catch(() => {
        // Soft-fail: this is a transparency surface; don't block the page.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId, localDate, refreshKey]);

  const rows: Row[] = useMemo(() => {
    if (!members) return [];
    return members.map((m) => {
      const isMe = m.user_id === userId;
      // For the signed-in user we know the email; for others we only have
      // user_id (no profile table yet). v1 fallback per the build brief.
      const label = isMe && userEmail ? userEmail : m.user_id.slice(0, 8);
      const initials = initialsFromString(label);
      return {
        userId: m.user_id,
        initials,
        label,
        submitted: submittedIds.has(m.user_id),
      };
    });
  }, [members, submittedIds, userId, userEmail]);

  const submittedCount = rows.filter((r) => r.submitted).length;
  const totalCount = rows.length;

  if (loading && !members) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card/30 px-4 py-3 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading coverage…
      </div>
    );
  }

  if (!members || members.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-card/30 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Coverage
        </h2>
        <span
          className="text-xs text-muted-foreground"
          aria-live="polite"
        >
          {submittedCount} of {totalCount} submitted today
        </span>
      </div>
      <ul
        aria-label="Today's submission coverage"
        className="mt-3 flex flex-wrap items-center gap-2"
      >
        {rows.map((row) => (
          <li key={row.userId}>
            <span
              role="img"
              aria-label={`${row.label} — ${
                row.submitted ? "submitted" : "not submitted"
              }`}
              title={`${row.label} — ${
                row.submitted ? "submitted" : "not submitted yet"
              }`}
              className={cn(
                "inline-flex h-8 w-8 select-none items-center justify-center rounded-full text-[11px] font-semibold",
                row.submitted
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-muted text-muted-foreground opacity-60"
              )}
            >
              {row.initials}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
