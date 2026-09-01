"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { addSubtask, toggleTaskStatus } from "@/app/actions/flux";
import { Avatar } from "@/app/components/ui/Avatar";
import { Drawer } from "@/app/components/ui/Drawer";
import { Gallery } from "@/app/components/ui/Gallery";
import { Icon } from "@/app/components/ui/Icon";
import { ProgressBar } from "@/app/components/ui/ProgressBar";
import { TaskFormDrawer } from "@/app/flux/tasks/task-form-drawer";
import { TaskCompletionButton } from "@/app/flux/tasks/task-completion-button";
import { TaskStatusBadge } from "@/app/flux/tasks/task-status-badge";
import { Markdown } from "@/app/flux/documents/markdown";
import { UpdatesFeed } from "@/app/flux/updates/updates-feed";
import { useFluxMilestones, useFluxProjects, useFluxTasks, useFluxUpdates, useFluxUsers, fluxUserName } from "@/app/lib/flux-context";
import { progressOf } from "@/app/lib/flux-progress";
import { TaskDueDate } from "@/app/flux/tasks/task-due-date";
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

function SubtaskRow({ subtask }: { subtask: FluxTask }) {
  const [pending, startTransition] = useTransition();
  const pathname = usePathname();
  const done = subtask.status === "done";

  const toggle = () => startTransition(() => { toggleTaskStatus(subtask.id, subtask.status, pathname) });

  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1.5">
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        disabled={pending}
        onClick={toggle}
        className={`flex size-4.5 shrink-0 items-center justify-center rounded-[6px] border ${
          done ? "border-accent bg-accent" : "border-border bg-transparent"
        } disabled:opacity-50`}
      >
        {done && <Icon name="check" size={12} className="text-accent-contrast" />}
      </button>
      <span
        onClick={toggle}
        className={`text-sm ${done ? "text-text-muted line-through" : "text-text"}`}
      >
        {subtask.title}
      </span>
    </label>
  );
}

function AddSubtaskForm({ task }: { task: FluxTask }) {
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();
  const pathname = usePathname();

  function submit() {
    const value = title.trim();
    if (!value) return;
    startTransition(() => { addSubtask(task.id, task.project, task.milestone, value, pathname) });
    setTitle("");
  }

  return (
    <div className="flex items-center gap-2 pt-1">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Lägg till deluppgift"
        className="flex-1 rounded border border-field-border bg-surface px-2.5 py-1.5 text-sm text-text"
      />
      <button
        type="button"
        aria-label="Lägg till deluppgift"
        disabled={pending || !title.trim()}
        onClick={submit}
        className="flex size-8 shrink-0 items-center justify-center rounded border border-border text-text-muted hover:text-text disabled:opacity-50"
      >
        <Icon name="plus" size={14} />
      </button>
    </div>
  );
}

export function TaskPanel() {
  const { openTaskId, closeTask } = useTaskPanel();
  const tasks = useFluxTasks();
  const projects = useFluxProjects();
  const milestones = useFluxMilestones();
  const updates = useFluxUpdates();
  const users = useFluxUsers();
  const [editingTask, setEditingTask] = useState<FluxTask | null>(null);

  const task = tasks.find((t) => t.id === openTaskId);
  const subtasks = task ? tasks.filter((t) => t.parent === task.id) : [];
  const subtaskProgress = progressOf(subtasks);

  return (
    <>
      <Drawer
        open={Boolean(task)}
        onOpenChange={(next) => !next && closeTask()}
        title={task?.title}
        panelClassName="max-w-4xl"
        headerActions={
          task && (
            <div className="flex items-center gap-2">
              <TaskCompletionButton id={task.id} status={task.status} />
              <button
                type="button"
                aria-label="Redigera uppgift"
                onClick={() => {
                  setEditingTask(task);
                  closeTask();
                }}
                className="text-text-faint hover:text-text"
              >
                <Icon name="pencil" size={16} />
              </button>
            </div>
          )
        }
      >
        {task && (
          <div className="flex flex-col gap-5">
            <p className="text-sm text-text-muted">
              {projects.find((p) => p.id === task.project)?.name ?? "—"}
              {task.milestone != null && (
                <> · {milestones.find((m) => m.id === task.milestone)?.title ?? "—"}</>
              )}
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-text-faint">Prioritet</span>
                <span
                  className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_TONE[task.priority]}`}
                >
                  {PRIORITY_LABEL[task.priority]}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-text-faint">Deadline</span>
                <TaskDueDate dueDate={task.due_date} status={task.status} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-text-faint">Status</span>
                <TaskStatusBadge status={task.status} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-text-faint">Tilldelade</span>
                <span className="flex gap-1">
                  {task.assignees.length === 0 && <span className="text-sm text-text-muted">—</span>}
                  {task.assignees.map((id) => (
                    <Avatar key={id} name={fluxUserName(users.get(id), id)} size={22} />
                  ))}
                </span>
              </div>
              {task.update_count > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-text-faint">Uppdateringar</span>
                  <span className="flex items-center gap-1 font-mono text-sm text-text">
                    <Icon name="message-square" size={14} />
                    {task.update_count}
                  </span>
                </div>
              )}
            </div>

            {task.description && <Markdown content={task.description} />}

            <Gallery files={task.files} />

            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-text-faint">Deluppgifter</span>
                {subtaskProgress.total > 0 && (
                  <span className="font-mono text-xs text-text-faint">
                    {subtaskProgress.done}/{subtaskProgress.total}
                  </span>
                )}
              </div>
              {subtaskProgress.total > 0 && <ProgressBar pct={subtaskProgress.pct} />}
              <div className="flex flex-col divide-y divide-border">
                {subtasks.map((subtask) => (
                  <SubtaskRow key={subtask.id} subtask={subtask} />
                ))}
              </div>
              <AddSubtaskForm task={task} />
            </div>

            <UpdatesFeed
              updates={updates.filter((update) => update.task === task.id)}
              defaultProject={task.project}
              defaultMilestone={task.milestone}
              defaultTask={task.id}
            />
          </div>
        )}
      </Drawer>

      {editingTask && (
        <TaskFormDrawer open={Boolean(editingTask)} onClose={() => setEditingTask(null)} task={editingTask} />
      )}
    </>
  );
}
