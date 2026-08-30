"use client";

import { Card } from "@/app/components/ui/Card";
import { Avatar } from "@/app/components/ui/Avatar";
import { ListTable, type ListTableColumn } from "@/app/components/ui/ListTable";
import { useFluxProjects, useFluxTasks, useFluxUsers, fluxUserName } from "@/app/lib/flux-context";
import { AddTaskButton } from "@/app/flux/tasks/add-task-button";
import { DeleteTaskButton } from "@/app/flux/tasks/delete-task-button";
import { TaskCompletionButton } from "@/app/flux/tasks/task-completion-button";
import { useTaskPanel } from "@/app/lib/task-panel-context";
import type { FluxTask, FluxTaskPriority } from "@/app/lib/dal";

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
      width: "64px",
      align: "center",
      render: (task) => <TaskCompletionButton id={task.id} status={task.status} />,
    },
    { key: "title", header: "Uppgift", render: (task) => task.title },
    { key: "project", header: "Projekt", width: "160px", render: (task) => projectName(task.project) },
    {
      key: "priority",
      header: "Prioritet",
      width: "100px",
      render: (task) => (
        <span
          className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_TONE[task.priority]}`}
        >
          {PRIORITY_LABEL[task.priority]}
        </span>
      ),
    },
    { key: "due", header: "Deadline", width: "120px", render: (task) => task.due_date ?? "—" },
    {
      key: "assignees",
      header: "Tilldelade",
      width: "140px",
      render: (task) => (
        <span className="flex items-center gap-1.5">
          {task.assignees.map((id) => (
            <Avatar key={id} name={fluxUserName(users.get(id), id)} size={20} />
          ))}
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
    <div className="flex flex-col gap-4 p-6">
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
          onRowClick={(task) => openTask(task.id)}
        />
      )}
    </div>
  );
}
