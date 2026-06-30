import { useEffect, useMemo, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getMyEntry, todayLocalDate } from "@/lib/queries/standup";
import { useSession } from "@/hooks/use-session";
import { useWorkspace } from "@/hooks/use-workspace";
import type { AsyncStandup } from "@/lib/types";

// Decrement a YYYY-MM-DD calendar date by one day. Parses as UTC midnight to
// avoid host-TZ arithmetic flipping the wrong day near DST boundaries.
export function yesterdayLocalDate(today: string): string {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function YesterdayEntry() {
  const { session } = useSession();
  const { workspace } = useWorkspace();
  const userId = session?.user?.id ?? null;
  const workspaceId = workspace?.id ?? null;

  const yesterdayDate = useMemo(() => yesterdayLocalDate(todayLocalDate()), []);

  const [entry, setEntry] = useState<AsyncStandup | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!workspaceId || !userId) return;
    let cancelled = false;
    setLoaded(false);
    getMyEntry(workspaceId, userId, yesterdayDate)
      .then((e) => {
        if (cancelled) return;
        setEntry(e);
      })
      .catch(() => {
        // Soft-fail: this is a secondary surface, no need to surface an error.
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId, userId, yesterdayDate]);

  if (!loaded || !entry) return null;

  const dateHeader = new Date(`${yesterdayDate}T00:00:00Z`).toLocaleDateString(
    [],
    { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" }
  );

  return (
    <div className="mt-4 rounded-lg border border-border bg-card/30 p-4">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Yesterday's entry
        </h2>
        <span className="text-xs text-muted-foreground">{dateHeader}</span>
      </header>
      <div className="space-y-3">
        <ReadOnlySection label="Yesterday" body={entry.yesterday} />
        <ReadOnlySection label="Today" body={entry.today} />
        <ReadOnlySection label="Blockers" body={entry.blockers} />
      </div>
    </div>
  );
}

function ReadOnlySection({ label, body }: { label: string; body: string }) {
  const trimmed = body.trim();
  return (
    <section>
      <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </h3>
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
