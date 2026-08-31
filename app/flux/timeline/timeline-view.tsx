"use client";

import { Avatar } from "@/app/components/ui/Avatar";
import { Badge } from "@/app/components/ui/Badge";
import { Icon } from "@/app/components/ui/Icon";
import { TaskCompletionButton } from "@/app/flux/tasks/task-completion-button";
import { TaskDueDate } from "@/app/flux/tasks/task-due-date";
import {
  fluxUserName,
  useFluxMilestones,
  useFluxProjects,
  useFluxTasks,
  useFluxUsers,
} from "@/app/lib/flux-context";
import { isTaskOverdue } from "@/app/lib/flux-task-dates";
import { formatDate } from "@/app/lib/format-date";
import type { FluxMilestone, FluxTask, FluxUser } from "@/app/lib/dal";
import { useTaskPanel } from "@/app/lib/task-panel-context";

const MILESTONE_STATUS: Record<FluxMilestone["status"], { label: string; variant: "neutral" | "warning" | "success" }> = {
  not_started: { label: "Ej påbörjad", variant: "neutral" },
  in_progress: { label: "Pågår", variant: "warning" },
  done: { label: "Klar", variant: "success" },
};

const PRIORITY_LABELS: Record<FluxTask["priority"], string> = {
  low: "Låg",
  medium: "Mellan",
  high: "Hög",
};

function TimelineTask({
  task,
  users,
  onOpen,
}: {
  task: FluxTask;
  users: Map<number, FluxUser>;
  onOpen: (id: number) => void;
}) {
  const overdue = isTaskOverdue(task.due_date, task.status);

  return (
    <div className="group grid grid-cols-[4.5rem_1.5rem_minmax(0,1fr)] items-start gap-2 sm:grid-cols-[6.5rem_2rem_minmax(0,1fr)] sm:gap-3">
      <span className={`pt-2 text-right font-mono text-[11px] ${overdue ? "font-semibold text-danger" : "text-text-faint"}`}>
        {task.due_date ? formatDate(task.due_date) : "Utan datum"}
      </span>
      <span className="relative flex h-full justify-center">
        <span className={`z-10 mt-2 size-2.5 rounded-full border-2 border-bg ${overdue ? "bg-danger" : task.status === "done" ? "bg-success" : "bg-text-faint"}`} />
      </span>
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
        className={`flex min-w-0 cursor-pointer items-center justify-between gap-3 border-b border-border/70 pb-3 text-left transition group-last:border-b-0 group-hover:border-border-strong ${overdue ? "text-danger" : "text-text"}`}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Icon name={task.status === "done" ? "check-circle-2" : "circle"} size={15} className={task.status === "done" ? "text-success" : "text-text-faint"} />
            <span className={`truncate text-sm font-medium ${task.status === "done" ? "text-text-muted line-through" : "text-text"}`}>
              {task.title}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 pl-[23px] text-[11px] text-text-faint">
            <span>{PRIORITY_LABELS[task.priority]} prioritet</span>
            {task.assignees.map((id) => (
              <Avatar key={id} name={fluxUserName(users.get(id), id)} size={17} />
            ))}
          </div>
        </div>
        <TaskCompletionButton id={task.id} status={task.status} compact className="opacity-60 group-hover:opacity-100" />
      </div>
    </div>
  );
}

function TimelineMilestone({ milestone }: { milestone: FluxMilestone }) {
  const status = MILESTONE_STATUS[milestone.status];

  return (
    <div className="grid grid-cols-[4.5rem_1.5rem_minmax(0,1fr)] items-start gap-2 sm:grid-cols-[6.5rem_2rem_minmax(0,1fr)] sm:gap-3">
      <span className="pt-1 text-right font-mono text-[11px] font-semibold text-accent">
        {milestone.target_date ? formatDate(milestone.target_date) : "Utan datum"}
      </span>
      <span className="relative flex h-full justify-center">
        <span className="z-10 mt-0.5 flex size-4 items-center justify-center rounded-full border-2 border-accent bg-bg text-accent">
          <span className="size-1.5 rounded-full bg-accent" />
        </span>
      </span>
      <div className="flex min-w-0 items-start justify-between gap-3 border-b border-accent/30 pb-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Icon name="flag" size={15} className="shrink-0 text-accent" />
            <span className="truncate text-sm font-semibold text-text">{milestone.title}</span>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <span className="mt-1 block pl-[23px] text-[11px] uppercase tracking-wide text-accent">Milstolpe</span>
        </div>
      </div>
    </div>
  );
}

export default function FluxTimelineView() {
  const projects = useFluxProjects();
  const tasks = useFluxTasks();
  const milestones = useFluxMilestones();
  const users = useFluxUsers();
  const { openTask } = useTaskPanel();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text">Tidslinje</h1>
          <p className="mt-1 text-sm text-text-muted">Milstolpar och deadlines för alla Flux-projekt.</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-text-faint">
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-accent" /> Milstolpe</span>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-danger" /> Försenad</span>
        </div>
      </div>

      {projects.length === 0 && <p className="text-sm text-text-muted">Inga projekt än.</p>}

      <div className="flex flex-col gap-8">
        {projects.map((project) => {
          const projectTasks = tasks.filter((task) => task.project === project.id);
          const projectMilestones = milestones.filter((milestone) => milestone.project === project.id);
          const datedItems = [
            ...projectMilestones
              .filter((milestone) => milestone.target_date)
              .map((milestone) => ({ type: "milestone" as const, date: milestone.target_date!, item: milestone })),
            ...projectTasks
              .filter((task) => task.due_date)
              .map((task) => ({ type: "task" as const, date: task.due_date!, item: task })),
          ].sort((a, b) => a.date.localeCompare(b.date));
          const undatedTasks = projectTasks.filter((task) => !task.due_date);
          const undatedMilestones = projectMilestones.filter((milestone) => !milestone.target_date);

          return (
            <section key={project.id} aria-labelledby={`timeline-project-${project.id}`}>
              <div className="mb-4 flex items-center gap-2 border-b border-border pb-2">
                <span className="size-2.5 rounded-full bg-accent" />
                <h2 id={`timeline-project-${project.id}`} className="text-sm font-semibold text-text">{project.name}</h2>
                <span className="text-xs text-text-faint">{projectTasks.length} {projectTasks.length === 1 ? "task" : "tasks"}</span>
              </div>

              {datedItems.length === 0 && undatedTasks.length === 0 && undatedMilestones.length === 0 ? (
                <p className="pl-20 text-sm text-text-muted">Inga uppgifter eller milstolpar.</p>
              ) : (
                <div className="relative flex flex-col gap-3 before:absolute before:bottom-2 before:left-[5.25rem] before:top-2 before:w-px before:bg-border sm:before:left-[7.5rem]">
                  {datedItems.map((entry) =>
                    entry.type === "milestone" ? (
                      <TimelineMilestone key={`milestone-${entry.item.id}`} milestone={entry.item} />
                    ) : (
                      <TimelineTask key={`task-${entry.item.id}`} task={entry.item} users={users} onOpen={openTask} />
                    ),
                  )}
                  {(undatedMilestones.length > 0 || undatedTasks.length > 0) && (
                    <div className="mt-3 border-t border-dashed border-border pt-4">
                      <p className="mb-3 pl-[5rem] text-[10px] font-semibold uppercase tracking-[0.16em] text-text-faint sm:pl-[7rem]">Utan datum</p>
                      <div className="flex flex-col gap-3">
                        {undatedMilestones.map((milestone) => <TimelineMilestone key={`undated-milestone-${milestone.id}`} milestone={milestone} />)}
                        {undatedTasks.map((task) => <TimelineTask key={`undated-task-${task.id}`} task={task} users={users} onOpen={openTask} />)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
