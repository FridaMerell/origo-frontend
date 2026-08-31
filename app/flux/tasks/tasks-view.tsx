"use client";

import { Card } from "@/app/components/ui/Card";
import { Avatar } from "@/app/components/ui/Avatar";
import { ListTable, type ListTableColumn } from "@/app/components/ui/ListTable";
import { useFluxProjects, useFluxTasks, useFluxUsers, fluxUserName } from "@/app/lib/flux-context";
import { AddTaskButton } from "@/app/flux/tasks/add-task-button";
import { DeleteTaskButton } from "@/app/flux/tasks/delete-task-button";
import { TaskDueDate } from "@/app/flux/tasks/task-due-date";
import { TaskCompletionButton } from "@/app/flux/tasks/task-completion-button";
import { useTaskPanel } from "@/app/lib/task-panel-context";
import type { FluxTask, FluxTaskPriority } from "@/app/lib/dal";
import { isTaskOverdue } from "@/app/lib/flux-task-dates";

const PRIORITY_TONE: Record<FluxTaskPriority, string> = {
  high: "text-danger bg-danger-wash",
  medium: "text-warning bg-warning-wash",
  low: "text-text-muted bg-surface-2",
};

const PRIORITY_LABEL: Record<FluxTaskPriority, string> = {
  high: "Hög",
  medium: "Medel",
  low: "Låg",
};

export default function FluxTasksView() {
  const projects = useFluxProjects();
  const tasks = useFluxTasks();
  const users = useFluxUsers();
  const { openTask } = useTaskPanel();
  const projectName = (id: number) => projects.find((p) => p.id === id)?.name ?? "—";

  const columns: ListTableColumn<FluxTask>[] = [
    {
      key: "status",
      header: "Klar",
      width: "88px",
      align: "center",
      render: (task) => <TaskCompletionButton id={task.id} status={task.status} />,
    },
    { key: "title", header: "Uppgift", render: (task) => task.title },
    {
      key: "meta",
      header: "Projekt / prioritet",
      width: "220px",
      render: (task) => (
        <span className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 truncate text-text">{projectName(task.project)}</span>
          <span
            className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_TONE[task.priority]}`}
          >
            {PRIORITY_LABEL[task.priority]}
          </span>
        </span>
      ),
    },
    {
      key: "schedule",
      header: "Deadline / tilldelade",
      width: "220px",
      render: (task) => (
        <span className="flex min-w-0 items-center justify-end gap-2">
          <TaskDueDate dueDate={task.due_date} status={task.status} compact className="shrink-0" />
          <span className="flex shrink-0 items-center gap-1.5">
            {task.assignees.map((id) => (
              <Avatar key={id} name={fluxUserName(users.get(id), id)} size={20} />
            ))}
          </span>
        </span>
      ),
    },
    {
      key: "actions",
      width: "64px",
      render: (task) => (
        <div className="flex items-center justify-end gap-1.5">
          <DeleteTaskButton id={task.id} />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-text">Uppgifter</h1>
        <AddTaskButton />
      </div>
      {tasks.length === 0 ? (
        <Card className="p-4 text-sm text-text-muted">Inga uppgifter än.</Card>
      ) : (
        <ListTable
          columns={columns}
          rows={tasks.map((task) => ({ id: task.id, item: task }))}
          rowClassName={(task) => (isTaskOverdue(task.due_date, task.status) ? "bg-danger-wash/20 hover:bg-danger-wash/30" : "hover:bg-surface-2")}
          onRowClick={(task) => openTask(task.id)}
        />
      )}
    </div>
  );
}
