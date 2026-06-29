import { TASK_STATUS_COLOR, TASK_STATUS_LABEL, type TaskStatus } from "@/lib/types";
import { cn } from "@/lib/cn";

export function StatusBadge({
  status,
  className,
}: {
  status: TaskStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        TASK_STATUS_COLOR[status],
        className
      )}
    >
      {TASK_STATUS_LABEL[status]}
    </span>
  );
}
