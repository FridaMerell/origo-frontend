"use client";

import { useParams } from "next/navigation";
import { Avatar } from "@/app/components/ui/Avatar";
import { Card } from "@/app/components/ui/Card";
import { Gallery } from "@/app/components/ui/Gallery";
import { Icon } from "@/app/components/ui/Icon";
import { ProgressBar } from "@/app/components/ui/ProgressBar";
import { AddMilestoneButton } from "@/app/flux/projects/add-milestone-button";
import { AddMilestoneTaskButton } from "@/app/flux/projects/add-milestone-task-button";
import { EditMilestoneButton } from "@/app/flux/projects/edit-milestone-button";
import { EditProjectButton } from "@/app/flux/projects/edit-project-button";
import { TaskCompletionButton } from "@/app/flux/tasks/task-completion-button";
import { UpdatesFeed } from "@/app/flux/updates/updates-feed";
import { useFluxMilestones, useFluxProjects, useFluxTasks, useFluxUpdates, useFluxUsers, fluxUserName } from "@/app/lib/flux-context";
import { progressOf } from "@/app/lib/flux-progress";
import { formatDate } from "@/app/lib/format-date";
import { TaskDueDate } from "@/app/flux/tasks/task-due-date";
import { isTaskOverdue } from "@/app/lib/flux-task-dates";
import { useTaskPanel } from "@/app/lib/task-panel-context";
import type { FluxTask, FluxTaskPriority, FluxUser } from "@/app/lib/dal";

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

function TaskRow({
  task,
  allTasks,
  users,
  onClick,
}: {
  task: FluxTask;
  allTasks: FluxTask[];
  users: Map<number, FluxUser>;
  onClick: () => void;
}) {
  const subtasks = allTasks.filter((t) => t.parent === task.id);
  return (
    <div
      onClick={onClick}
      className={`flex cursor-pointer items-center justify-between gap-3 border-b border-border px-4 py-2.5 text-sm last:border-b-0 ${isTaskOverdue(task.due_date, task.status) ? "bg-danger-wash/20 hover:bg-danger-wash/30" : "hover:bg-surface-2"}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <TaskCompletionButton id={task.id} status={task.status} />
        <span className="min-w-0 truncate text-text">{task.title}</span>
      </div>
      <span className="flex shrink-0 items-center gap-3">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_TONE[task.priority]}`}
        >
          {PRIORITY_LABEL[task.priority]}
        </span>
        <TaskDueDate dueDate={task.due_date} status={task.status} compact />
        {subtasks.length > 0 && (
          <span className="font-mono text-xs text-text-faint">
            {subtasks.filter((t) => t.status === "done").length}/{subtasks.length}
          </span>
        )}
        {task.update_count > 0 && (
          <span className="flex items-center gap-1 font-mono text-xs text-text-faint">
            <Icon name="message-square" size={12} />
            {task.update_count}
          </span>
        )}
        <span className="flex gap-1">
          {task.assignees.map((assigneeId) => (
            <Avatar key={assigneeId} name={fluxUserName(users.get(assigneeId), assigneeId)} size={18} />
          ))}
        </span>
      </span>
    </div>
  );
}

export default function FluxProjectDetailView() {
  const { id } = useParams<{ id: string }>();
  const projects = useFluxProjects();
  const milestones = useFluxMilestones();
  const tasks = useFluxTasks();
  const updates = useFluxUpdates();
  const users = useFluxUsers();
  const { openTask } = useTaskPanel();

  const project = projects.find((p) => String(p.id) === id);

  if (!project) {
    return <div className="text-sm text-text-muted">Projektet hittades inte.</div>;
  }

  const projectTasks = tasks.filter((task) => task.project === project.id);
  const projectMilestones = milestones.filter((m) => m.project === project.id);
  const unassignedTasks = projectTasks.filter((task) => task.milestone === null && task.parent === null);
  const overallProgress = progressOf(projectTasks);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <h1 className="m-0 font-display text-[28px] font-semibold text-text">{project.name}</h1>
          <EditProjectButton project={project} />
        </div>
        {project.description && <p className="text-[15px] text-text-muted">{project.description}</p>}
        <Gallery files={project.files} />
        <div className="flex items-center gap-4">
          {project.members.length > 0 && (
            <div className="flex gap-1.5">
              {project.members.map((memberId) => (
                <Avatar key={memberId} name={fluxUserName(users.get(memberId), memberId)} size={26} />
              ))}
            </div>
          )}
          <ProgressBar pct={overallProgress.pct} width={220} />
          <span className="font-mono text-xs text-text-faint">
            {overallProgress.done}/{overallProgress.total}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="m-0 text-base font-semibold text-text-muted">Delmål</h2>
          <AddMilestoneButton projectId={project.id} />
        </div>

        {projectMilestones.length === 0 && (
          <p className="text-sm text-text-muted">Inget delmål skapat.</p>
        )}

        {projectMilestones.map((milestone) => {
          const milestoneTasks = tasks.filter((task) => task.milestone === milestone.id);
          const milestoneProgress = progressOf(milestoneTasks);
          return (
            <Card key={milestone.id} className="flex flex-col gap-0 p-0">
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Icon name="flag" size={15} className="shrink-0 text-text-muted" />
                  <span className="truncate text-[15px] font-semibold text-text">{milestone.title}</span>
                  <EditMilestoneButton milestone={milestone} />
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {milestone.update_count > 0 && (
                    <span className="flex items-center gap-1 font-mono text-xs text-text-faint">
                      <Icon name="message-square" size={12} />
                      {milestone.update_count}
                    </span>
                  )}
                  <span className="font-mono text-xs text-text-faint">
                    {milestone.target_date ? formatDate(milestone.target_date) : "Ingen deadline"}
                  </span>
                  <ProgressBar pct={milestoneProgress.pct} width={120} />
                </div>
              </div>

              {milestone.files.length > 0 && (
                <div className="border-b border-border px-4 py-3">
                  <Gallery files={milestone.files} />
                </div>
              )}

              {milestoneTasks.length === 0 ? (
                <div className="px-4 py-3 text-sm text-text-muted">Inga uppgifter än.</div>
              ) : (
                milestoneTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    allTasks={tasks}
                    users={users}
                    onClick={() => openTask(task.id)}
                  />
                ))
              )}

              <div className="border-t border-border">
                <AddMilestoneTaskButton projectId={project.id} milestoneId={milestone.id} />
              </div>
            </Card>
          );
        })}
      </div>

      {unassignedTasks.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="m-0 text-base font-semibold text-text-muted">Inget delmål</h2>
          <Card className="flex flex-col gap-0 p-0">
            {unassignedTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                allTasks={tasks}
                users={users}
                onClick={() => openTask(task.id)}
              />
            ))}
          </Card>
        </div>
      )}

      <UpdatesFeed
        updates={updates.filter((update) => update.project === project.id)}
        defaultProject={project.id}
        defaultMilestone={null}
        defaultTask={null}
        showScope
      />
    </div>
  );
}
