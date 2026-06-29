import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Plus, FolderKanban } from "lucide-react";
import { useWorkspace } from "@/hooks/use-workspace";
import { getProjectBySlug } from "@/lib/queries/projects";
import {
  listTasksForProject,
  createTask,
  updateTask,
} from "@/lib/queries/tasks";
import {
  TASK_STATUSES,
  TASK_STATUS_LABEL,
  type Project,
  type Task,
  type TaskStatus,
} from "@/lib/types";
import { cn } from "@/lib/cn";

interface Props {
  selectedTaskId: string | null;
  onSelectTask: (id: string | null) => void;
  // Increment-and-pass key from parent to force a refetch (CommandBar create).
  refreshSignal: number;
  // Allow CommandBar to know what project is current.
  onProjectLoaded: (project: Project | null) => void;
}

export function ProjectDetail({
  selectedTaskId,
  onSelectTask,
  refreshSignal,
  onProjectLoaded,
}: Props) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { workspace, loading: wsLoading } = useWorkspace();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingStatus, setCreatingStatus] = useState<TaskStatus | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newMotivation, setNewMotivation] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const reload = useCallback(async () => {
    if (!workspace || !slug) return;
    setLoading(true);
    try {
      const p = await getProjectBySlug(workspace.id, slug);
      setProject(p);
      onProjectLoaded(p);
      if (p) setTasks(await listTasksForProject(p.id));
      else setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [workspace?.id, slug, onProjectLoaded]);

  useEffect(() => {
    reload();
  }, [reload, refreshSignal]);

  const grouped = useMemo(() => {
    const out: Record<TaskStatus, Task[]> = {
      backlog: [],
      up_next: [],
      in_progress: [],
      in_review: [],
      done: [],
    };
    for (const t of tasks) out[t.status].push(t);
    return out;
  }, [tasks]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!project || !creatingStatus || !newTitle.trim() || !newMotivation.trim()) {
      return;
    }
    const created = await createTask({
      project_id: project.id,
      title: newTitle.trim(),
      motivation: newMotivation.trim(),
      status: creatingStatus,
    });
    setTasks((prev) => [...prev, created]);
    setNewTitle("");
    setNewMotivation("");
    setCreatingStatus(null);
  }

  async function onDragEnd(e: DragEndEvent) {
    const id = String(e.active.id);
    const target = e.over?.id;
    if (!target) return;
    const newStatus = String(target) as TaskStatus;
    const t = tasks.find((x) => x.id === id);
    if (!t || t.status === newStatus) return;
    // Optimistic
    setTasks((prev) =>
      prev.map((x) => (x.id === id ? { ...x, status: newStatus } : x))
    );
    try {
      await updateTask(id, { status: newStatus });
    } catch {
      // Roll back on failure
      setTasks((prev) =>
        prev.map((x) => (x.id === id ? { ...x, status: t.status } : x))
      );
    }
  }

  if (wsLoading || loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (!project) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
        Project not found.{" "}
        <button
          type="button"
          onClick={() => navigate("/p")}
          className="text-primary hover:underline"
        >
          Back to projects
        </button>
      </div>
    );
  }

  return (
    <section className="flex h-full flex-col">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <FolderKanban className="h-5 w-5 text-primary" />
            {project.name}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {tasks.length} task{tasks.length === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid flex-1 grid-cols-1 gap-3 overflow-x-auto md:grid-cols-2 lg:grid-cols-5">
          {TASK_STATUSES.map((status) => (
            <Column
              key={status}
              status={status}
              tasks={grouped[status]}
              selectedTaskId={selectedTaskId}
              onSelectTask={onSelectTask}
              onStartCreate={() => {
                setCreatingStatus(status);
                setNewTitle("");
                setNewMotivation("");
              }}
              isCreating={creatingStatus === status}
              newTitle={newTitle}
              newMotivation={newMotivation}
              setNewTitle={setNewTitle}
              setNewMotivation={setNewMotivation}
              onCreate={onCreate}
              onCancelCreate={() => setCreatingStatus(null)}
            />
          ))}
        </div>
      </DndContext>
    </section>
  );
}

function Column({
  status,
  tasks,
  selectedTaskId,
  onSelectTask,
  onStartCreate,
  isCreating,
  newTitle,
  newMotivation,
  setNewTitle,
  setNewMotivation,
  onCreate,
  onCancelCreate,
}: {
  status: TaskStatus;
  tasks: Task[];
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
  onStartCreate: () => void;
  isCreating: boolean;
  newTitle: string;
  newMotivation: string;
  setNewTitle: (v: string) => void;
  setNewMotivation: (v: string) => void;
  onCreate: (e: FormEvent) => void;
  onCancelCreate: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[200px] flex-col gap-2 rounded-lg border border-border bg-card/40 p-2",
        isOver && "border-primary/70 bg-primary/5"
      )}
      data-status={status}
    >
      <div className="flex items-center justify-between px-1 pb-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {TASK_STATUS_LABEL[status]}{" "}
          <span className="ml-1 text-foreground">{tasks.length}</span>
        </div>
        <button
          type="button"
          onClick={onStartCreate}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={`Add task to ${TASK_STATUS_LABEL[status]}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {tasks.map((t) => (
          <TaskCard
            key={t.id}
            task={t}
            selected={t.id === selectedTaskId}
            onOpen={() => onSelectTask(t.id)}
          />
        ))}
        {isCreating ? (
          <form
            onSubmit={onCreate}
            className="rounded-md border border-primary/40 bg-background p-2"
          >
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Title"
              className="w-full bg-transparent text-sm font-medium outline-none"
            />
            <input
              value={newMotivation}
              onChange={(e) => setNewMotivation(e.target.value)}
              placeholder="Why? (required)"
              className="mt-1 w-full bg-transparent text-xs text-muted-foreground outline-none placeholder:text-muted-foreground/70"
            />
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onCancelCreate}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newTitle.trim() || !newMotivation.trim()}
                className="rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function TaskCard({
  task,
  selected,
  onOpen,
}: {
  task: Task;
  selected: boolean;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        // Only treat as click when not dragging.
        if (!isDragging) onOpen();
        e.stopPropagation();
      }}
      className={cn(
        "cursor-pointer rounded-md border border-border bg-background p-2.5 text-left shadow-sm transition-colors hover:border-primary/60",
        selected && "border-primary/80",
        isDragging && "opacity-50"
      )}
      data-task-id={task.id}
    >
      <div className="text-sm font-medium leading-tight">{task.title}</div>
      <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
        {task.motivation}
      </div>
    </div>
  );
}
