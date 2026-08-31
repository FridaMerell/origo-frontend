"use client";

import { Avatar } from "@/app/components/ui/Avatar";
import { Icon } from "@/app/components/ui/Icon";
import { TaskCompletionButton } from "@/app/flux/tasks/task-completion-button";
import { TaskDueDate } from "@/app/flux/tasks/task-due-date";
import { isTaskOverdue } from "@/app/lib/flux-task-dates";
import { fluxUserName, useFluxProjects, useFluxTasks, useFluxUsers } from "@/app/lib/flux-context";
import type { FluxTask, FluxTaskPriority, FluxUser } from "@/app/lib/dal";
import { useTaskPanel } from "@/app/lib/task-panel-context";

const PRIORITIES: {
  label: string;
  priority: FluxTaskPriority;
  color: string;
  textColor: string;
}[] = [
  { label: "Hög prioritet", priority: "high", color: "bg-danger", textColor: "text-danger" },
  { label: "Mellanprioritet", priority: "medium", color: "bg-warning", textColor: "text-warning" },
  { label: "Låg prioritet", priority: "low", color: "bg-text-faint", textColor: "text-text-muted" },
];

function BacklogRow({
  task,
  projectName,
  users,
  onOpen,
}: {
  task: FluxTask;
  projectName: string;
  users: Map<number, FluxUser>;
  onOpen: (id: number) => void;
}) {
  const overdue = isTaskOverdue(task.due_date, task.status);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(task.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(task.id);
        }
      }}
      className={`group grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 text-left transition hover:bg-surface-2/60 sm:grid-cols-[auto_minmax(0,1fr)_10rem_auto] ${overdue ? "border-l-2 border-danger" : "border-l-2 border-transparent"}`}
    >
      <Icon name="circle" size={16} className="text-text-faint" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-text">{task.title}</p>
        <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-text-muted">
          <span className="truncate">{projectName}</span>
          <span className="size-1 shrink-0 rounded-full bg-border" />
          <span className="shrink-0">{task.assignees.length} {task.assignees.length === 1 ? "ansvarig" : "ansvariga"}</span>
        </div>
      </div>
      <div className="hidden justify-self-end sm:block">
        <TaskDueDate dueDate={task.due_date} status={task.status} compact />
      </div>
      <div className="flex items-center gap-2 justify-self-end">
        {task.assignees.length > 0 && (
          <div className="hidden -space-x-1 sm:flex">
            {task.assignees.map((id) => (
              <Avatar key={id} name={fluxUserName(users.get(id), id)} size={20} />
            ))}
          </div>
        )}
        <TaskCompletionButton id={task.id} status={task.status} compact className="opacity-60 group-hover:opacity-100" />
      </div>
      <div className="col-start-2 row-start-2 sm:hidden">
        <TaskDueDate dueDate={task.due_date} status={task.status} compact />
      </div>
    </div>
  );
}

export default function FluxBacklogView() {
  const projects = useFluxProjects();
  const tasks = useFluxTasks();
  const users = useFluxUsers();
  const { openTask } = useTaskPanel();
  const today = new Date().toISOString().split("T")[0];
  const backlogTasks = tasks.filter((task) => task.status !== "done" && task.due_date && task.due_date <= today);
  const projectName = (id: number) => projects.find((project) => project.id === id)?.name ?? "Okänt projekt";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between border-b border-border pb-5">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text">Backlog</h1>
        </div>
        <div className="text-right">
          <span className="block font-display text-3xl font-semibold leading-none text-text">{backlogTasks.length}</span>
          <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-text-faint">öppna tasks</span>
        </div>
      </header>

      {backlogTasks.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center gap-2 border border-dashed border-border text-center">
          <Icon name="check-circle-2" size={24} className="text-success" />
          <p className="text-sm font-medium text-text">Backloggen är tom</p>
          <p className="text-sm text-text-muted">Inga förfallna eller aktuella tasks just nu.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-7">
          {PRIORITIES.map(({ label, priority, color, textColor }) => {
            const priorityTasks = backlogTasks.filter((task) => task.priority === priority);
            return (
              <section key={priority} aria-labelledby={`backlog-${priority}`}>
                <div className="mb-2 flex items-center gap-2 px-1">
                  <span className={`size-2.5 rounded-full ${color}`} />
                  <h2 id={`backlog-${priority}`} className={`text-sm font-semibold ${textColor}`}>{label}</h2>
                  <span className="text-xs text-text-faint">{priorityTasks.length}</span>
                </div>
                <div className="overflow-hidden rounded border border-border bg-surface">
                  {priorityTasks.length === 0 ? (
                    <p className="px-4 py-4 text-sm text-text-faint">Inga tasks med denna prioritet.</p>
                  ) : (
                    priorityTasks.map((task) => (
                      <BacklogRow key={task.id} task={task} projectName={projectName(task.project)} users={users} onOpen={openTask} />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
