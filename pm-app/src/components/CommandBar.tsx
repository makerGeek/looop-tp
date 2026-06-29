import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutGrid, Inbox, FolderKanban, Plus } from "lucide-react";
import { listProjects } from "@/lib/queries/projects";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/cn";

interface Props {
  open: boolean;
  onClose: () => void;
  workspaceId: string | null;
  onCreateTask: () => void;
}

interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  run: () => void;
}

export function CommandBar({
  open,
  onClose,
  workspaceId,
  onCreateTask,
}: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!open || !workspaceId) return;
    listProjects(workspaceId).then(setProjects).catch(() => setProjects([]));
  }, [open, workspaceId]);

  const items: CommandItem[] = useMemo(() => {
    const base: CommandItem[] = [
      {
        id: "go:inbox",
        label: "Go to Inbox",
        hint: "/",
        icon: Inbox,
        run: () => navigate("/"),
      },
      {
        id: "go:projects",
        label: "Go to Projects",
        hint: "/p",
        icon: FolderKanban,
        run: () => navigate("/p"),
      },
      {
        id: "create:task",
        label: "Create task in current project",
        icon: Plus,
        run: onCreateTask,
      },
      ...projects.map<CommandItem>((p) => ({
        id: `go:project:${p.id}`,
        label: `Open project: ${p.name}`,
        hint: `/p/${p.slug}`,
        icon: LayoutGrid,
        run: () => navigate(`/p/${p.slug}`),
      })),
    ];
    if (!query) return base;
    const q = query.toLowerCase();
    return base.filter((c) => c.label.toLowerCase().includes(q));
  }, [projects, query, navigate, onCreateTask]);

  useEffect(() => {
    if (active >= items.length) setActive(0);
  }, [items.length, active]);

  if (!open) return null;

  function commit(item: CommandItem) {
    item.run();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      data-testid="command-bar"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, items.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const item = items[active];
              if (item) commit(item);
            } else if (e.key === "Escape") {
              onClose();
            }
          }}
          placeholder="Type a command or search projects…"
          className="w-full bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
        />
        <div className="max-h-80 overflow-y-auto border-t border-border">
          {items.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">
              No matches.
            </div>
          ) : (
            <ul>
              {items.map((it, i) => {
                const Icon = it.icon;
                const isActive = i === active;
                return (
                  <li key={it.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => commit(it)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2 text-left text-sm",
                        isActive
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate">{it.label}</span>
                      {it.hint ? (
                        <span className="text-[10px] text-muted-foreground">
                          {it.hint}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <footer className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
          ↑↓ navigate · ↵ run · esc close
        </footer>
      </div>
    </div>
  );
}
