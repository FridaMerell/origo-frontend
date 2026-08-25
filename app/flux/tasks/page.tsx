"use client";

import { Card } from "@/app/components/ui/Card";
import { Avatar } from "@/app/components/ui/Avatar";
import { useFluxProjects, useFluxTasks, useFluxUsers, fluxUserName } from "@/app/lib/flux-context";
import { AddTaskButton } from "@/app/flux/tasks/add-task-button";
import { DeleteTaskButton } from "@/app/flux/tasks/delete-task-button";
import type { FluxTaskPriority } from "@/app/lib/dal";

const PRIORITY_TONE: Record<FluxTaskPriority, string> = {
  high: "text-danger bg-danger-wash",
  medium: "text-warning bg-warning-wash",
  low: "text-text-muted bg-surface-2",
};

export default function FluxTasksPage() {
  const projects = useFluxProjects();
  const tasks = useFluxTasks();
  const users = useFluxUsers();
  const projectName = (id: number) => projects.find((p) => p.id === id)?.name ?? "—";

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-text">Tasks</h1>
        <AddTaskButton />
      </div>
      <Card className="overflow-hidden p-0">
        <div className="grid grid-cols-[1fr_160px_100px_120px_140px_32px] border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-faint">
          <span>Task</span>
          <span>Project</span>
          <span>Priority</span>
          <span>Due</span>
          <span>Assignees</span>
          <span></span>
        </div>
        {tasks.length === 0 && (
          <div className="px-4 py-6 text-sm text-text-muted">No tasks yet.</div>
        )}
        {tasks.map((task) => (
          <div
            key={task.id}
            className="grid grid-cols-[1fr_160px_100px_120px_140px_32px] items-center border-b border-border px-4 py-3 last:border-b-0"
          >
            <span className="text-sm text-text">{task.title}</span>
            <span className="text-sm text-text-muted">{projectName(task.project)}</span>
            <span
              className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${PRIORITY_TONE[task.priority]}`}
            >
              {task.priority}
            </span>
            <span className="font-mono text-sm text-text-muted">
              {task.due_date ?? "—"}
            </span>
            <span className="flex items-center gap-1.5">
              {task.assignees.map((id) => (
                <Avatar key={id} name={fluxUserName(users.get(id), id)} size={20} />
              ))}
            </span>
            <DeleteTaskButton id={task.id} />
          </div>
        ))}
      </Card>
    </div>
  );
}
