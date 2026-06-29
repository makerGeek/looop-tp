import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { FolderKanban, Plus } from "lucide-react";
import { useWorkspace } from "@/hooks/use-workspace";
import { listProjects, createProject } from "@/lib/queries/projects";
import type { Project } from "@/lib/types";

export function Projects() {
  const { workspace, loading: wsLoading, error: wsError } = useWorkspace();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!workspace) return;
    listProjects(workspace.id).then(setProjects);
  }, [workspace?.id]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!workspace || !name.trim()) return;
    setCreating(true);
    try {
      const p = await createProject({
        workspace_id: workspace.id,
        name: name.trim(),
      });
      setProjects((prev) => [p, ...(prev ?? [])]);
      setName("");
    } finally {
      setCreating(false);
    }
  }

  if (wsLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (wsError) {
    return (
      <p className="text-sm text-destructive">Workspace error: {wsError}</p>
    );
  }
  if (!workspace) {
    return (
      <p className="text-sm text-muted-foreground">No workspace available.</p>
    );
  }

  return (
    <section>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <FolderKanban className="h-5 w-5 text-primary" />
            Projects
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Workspace: <span className="font-medium">{workspace.name}</span>
          </p>
        </div>
        <form onSubmit={onCreate} className="flex items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New project name"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Create
          </button>
        </form>
      </header>

      {projects === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
          No projects yet. Use the input above to create your first one.
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                to={`/p/${p.slug}`}
                className="block rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/60"
              >
                <div className="text-sm font-semibold">{p.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Created {new Date(p.created_at).toLocaleDateString()}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
