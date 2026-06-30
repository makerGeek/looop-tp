import { useCallback, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { listMyHistory, todayLocalDate } from "@/lib/queries/standup";
import { yesterdayLocalDate } from "@/components/standup/YesterdayEntry";
import { useSession } from "@/hooks/use-session";
import { useWorkspace } from "@/hooks/use-workspace";
import type { AsyncStandup } from "@/lib/types";

type FetchState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "loaded"; entries: AsyncStandup[] }
  | { kind: "error" };

export function EntryHistory() {
  const { session } = useSession();
  const { workspace } = useWorkspace();
  const userId = session?.user?.id ?? null;
  const workspaceId = workspace?.id ?? null;

  // Compute "today" and "yesterday" so we can exclude them from history
  // (today is in the form above; yesterday already renders via YesterdayEntry).
  const { todayDate, yesterdayDate } = useMemo(() => {
    const t = todayLocalDate();
    return { todayDate: t, yesterdayDate: yesterdayLocalDate(t) };
  }, []);

  const [open, setOpen] = useState(false);
  const [state, setState] = useState<FetchState>({ kind: "idle" });

  const fetchHistory = useCallback(async () => {
    if (!workspaceId || !userId) return;
    setState({ kind: "loading" });
    try {
      const rows = await listMyHistory(workspaceId, userId);
      const filtered = rows.filter(
        (e) => e.local_date !== todayDate && e.local_date !== yesterdayDate
      );
      setState({ kind: "loaded", entries: filtered });
    } catch {
      setState({ kind: "error" });
    }
  }, [workspaceId, userId, todayDate, yesterdayDate]);

  const onToggle = useCallback(() => {
    setOpen((wasOpen) => {
      const nextOpen = !wasOpen;
      // Lazy-fetch on first expand. Cache for the rest of the session: once
      // we've loaded, opening + closing doesn't re-fire.
      if (nextOpen && state.kind === "idle") {
        void fetchHistory();
      }
      return nextOpen;
    });
  }, [state.kind, fetchHistory]);

  const onRetry = useCallback(() => {
    void fetchHistory();
  }, [fetchHistory]);

  return (
    <section className="mt-8 rounded-lg border border-border bg-card/30">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium hover:bg-muted/40"
      >
        <span className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          Show history
        </span>
        {state.kind === "loaded" ? (
          <span className="text-xs text-muted-foreground">
            {state.entries.length}{" "}
            {state.entries.length === 1 ? "entry" : "entries"}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="border-t border-border px-4 py-4">
          {state.kind === "loading" ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading history…
            </div>
          ) : null}

          {state.kind === "error" ? (
            <button
              type="button"
              onClick={onRetry}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Couldn't load history. Tap to retry.
            </button>
          ) : null}

          {state.kind === "loaded" && state.entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No past entries yet.
            </p>
          ) : null}

          {state.kind === "loaded" && state.entries.length > 0 ? (
            <ul className="space-y-3">
              {state.entries.map((entry) => (
                <li key={entry.id}>
                  <PastEntryCard entry={entry} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function formatDateHeader(localDate: string): string {
  // Parse the YYYY-MM-DD as UTC midnight and format in UTC to avoid the
  // host-TZ shifting the day backwards for users west of UTC. Matches the
  // same pattern YesterdayEntry uses.
  const d = new Date(`${localDate}T00:00:00Z`);
  const weekday = d.toLocaleDateString([], {
    weekday: "short",
    timeZone: "UTC",
  });
  const monthDay = d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return `${weekday} · ${monthDay}`;
}

function PastEntryCard({ entry }: { entry: AsyncStandup }) {
  return (
    <article className="rounded-lg border border-border bg-card/40 p-4">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {formatDateHeader(entry.local_date)}
        </h3>
      </header>
      <div className="space-y-3">
        <ReadOnlySection label="Yesterday" body={entry.yesterday} />
        <ReadOnlySection label="Today" body={entry.today} />
        <ReadOnlySection label="Blockers" body={entry.blockers} />
      </div>
    </article>
  );
}

function ReadOnlySection({ label, body }: { label: string; body: string }) {
  const trimmed = body.trim();
  return (
    <section>
      <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </h4>
      {trimmed ? (
        <div className="prose prose-invert prose-sm max-w-none rounded-md border border-border/60 bg-background/40 px-3 py-2">
          <Markdown remarkPlugins={[remarkGfm]}>{body}</Markdown>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">—</p>
      )}
    </section>
  );
}
