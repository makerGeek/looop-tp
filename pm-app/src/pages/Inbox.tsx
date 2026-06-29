import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSession } from "@/hooks/use-session";
import { listInboxTasks } from "@/lib/queries/tasks";
import type { Task } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Inbox as InboxIcon } from "lucide-react";

export function Inbox({ onOpenTask }: { onOpenTask: (id: string) => void }) {
  const { session } = useSession();
  const [tasks, setTasks] = useState<Task[] | null>(null);

  useEffect(() => {
    if (!session?.user) return;
    listInboxTasks(session.user.id).then(setTasks).catch(() => setTasks([]));
  }, [session?.user]);

  return (
    <section>
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <InboxIcon className="h-5 w-5 text-primary" />
          Inbox
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Open tasks assigned to you, most recently changed first.
        </p>
      </header>

      {tasks === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
          Inbox zero. Create your first project to add tasks.{" "}
          <Link to="/p" className="text-primary hover:underline">
            Projects →
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {tasks.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onOpenTask(t.id)}
                className="flex w-full items-start gap-4 px-4 py-3 text-left hover:bg-muted/40"
              >
                <StatusBadge status={t.status} className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{t.title}</div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {t.motivation}
                  </div>
                </div>
                <div className="shrink-0 text-[10px] text-muted-foreground">
                  {new Date(t.updated_at).toLocaleDateString()}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
