export type TaskStatus =
  | "backlog"
  | "up_next"
  | "in_progress"
  | "in_review"
  | "done";

export const TASK_STATUSES: TaskStatus[] = [
  "backlog",
  "up_next",
  "in_progress",
  "in_review",
  "done",
];

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  backlog: "Backlog",
  up_next: "Up next",
  in_progress: "In progress",
  in_review: "In review",
  done: "Done",
};

export const TASK_STATUS_COLOR: Record<TaskStatus, string> = {
  backlog: "bg-slate-500/20 text-slate-200",
  up_next: "bg-sky-500/20 text-sky-200",
  in_progress: "bg-amber-500/20 text-amber-200",
  in_review: "bg-violet-500/20 text-violet-200",
  done: "bg-emerald-500/20 text-emerald-200",
};

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: "owner" | "member" | "guest";
  joined_at: string;
}

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  description: string | null;
  archived_at: string | null;
  created_at: string;
  created_by: string | null;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  motivation: string;
  description: string | null;
  status: TaskStatus;
  assignee_id: string | null;
  due_at: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface Comment {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export interface Attachment {
  id: string;
  task_id: string;
  storage_path: string;
  filename: string;
  mime: string;
  size_bytes: number;
  uploaded_by: string;
  created_at: string;
}
