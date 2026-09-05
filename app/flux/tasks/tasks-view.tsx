"use client"

import { Avatar } from "@/app/components/ui/Avatar"
import { Card } from "@/app/components/ui/Card"
import { Icon } from "@/app/components/ui/Icon"
import { AddTaskButton } from "@/app/flux/tasks/add-task-button"
import { DeleteTaskButton } from "@/app/flux/tasks/delete-task-button"
import { TaskCompletionButton } from "@/app/flux/tasks/task-completion-button"
import { TaskDueDate } from "@/app/flux/tasks/task-due-date"
import { useTaskPanel } from "@/app/lib/task-panel-context"
import { fluxUserName, useFluxProjects, useFluxTasks, useFluxUsers } from "@/app/flux/_state/flux-context"
import { isTaskOverdue, OVERDUE_ROW_TONE } from "@/app/lib/flux-task-dates"
import { sortFluxTasks } from "@/app/flux/_state/flux-task-sort"
import type { FluxTask } from "@/app/lib/dal"

function TaskRow({ task, projectName }: { task: FluxTask; projectName: string }) {
  const users = useFluxUsers()
  const { openTask } = useTaskPanel()
  return (
    <div onClick={() => openTask(task.id)} className={`group flex cursor-pointer items-center gap-3 border-b border-border px-4 py-3.5 last:border-b-0 ${isTaskOverdue(task.due_date, task.status) ? OVERDUE_ROW_TONE : "hover:bg-surface-2"}`}>
      <TaskCompletionButton id={task.id} status={task.status} compact />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1"><span className="truncate text-sm font-semibold text-text">{task.title}</span><span className="text-xs text-text-faint">{projectName}</span></div>
        <div className="mt-1 flex items-center gap-2"><TaskDueDate dueDate={task.due_date} status={task.status} compact className="text-xs" />{task.priority === "high" && <span className="text-xs font-medium text-danger">Hög prioritet</span>}</div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="flex -space-x-1.5">{task.assignees.map((id) => <Avatar key={id} name={fluxUserName(users.get(id), id)} size={24} />)}</div>
        <span className="opacity-0 group-hover:opacity-100"><DeleteTaskButton id={task.id} /></span>
        <Icon name="chevron-right" size={17} className="text-text-faint" />
      </div>
    </div>
  )
}

function TaskSection({ title, hint, tasks, projectName, tone = "default" }: { title: string; hint: string; tasks: FluxTask[]; projectName: (id: number) => string; tone?: "default" | "danger" }) {
  if (!tasks.length) return null
  return <section className="max-w-5xl"><div className="mb-3 flex items-baseline gap-3"><h2 className={tone === "danger" ? "text-base font-semibold text-danger" : "text-base font-semibold text-text"}>{title}</h2><span className="text-xs text-text-faint">{hint} · {tasks.length}</span></div><Card className="!gap-0 !p-0 overflow-hidden">{sortFluxTasks(tasks).map((task) => <TaskRow key={task.id} task={task} projectName={projectName(task.project)} />)}</Card></section>
}

export default function FluxTasksView() {
  const projects = useFluxProjects()
  const tasks = useFluxTasks()
  const projectName = (id: number) => projects.find((project) => project.id === id)?.name ?? "—"
  const overdue = tasks.filter((task) => isTaskOverdue(task.due_date, task.status))
  const active = tasks.filter((task) => task.status === "in_progress")
  const open = tasks.filter((task) => task.status === "not_started" && !isTaskOverdue(task.due_date, task.status))
  const done = tasks.filter((task) => task.status === "done")

  return <div className="mx-auto flex w-full max-w-6xl flex-col gap-9 pb-12">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-faint">Arbetsyta</p><h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-text">Uppgifter</h1><p className="mt-2 text-sm text-text-muted">Börja med det som behöver din uppmärksamhet.</p></div><AddTaskButton /></header>
    {tasks.length === 0 ? <Card className="text-sm text-text-muted">Inga uppgifter än.</Card> : <div className="flex flex-col gap-8"><TaskSection title="Behöver uppmärksamhet" hint="Försenade" tasks={overdue} projectName={projectName} tone="danger" /><TaskSection title="Pågår nu" hint="Påbörjade" tasks={active} projectName={projectName} /><TaskSection title="Nästa uppgifter" hint="Öppna" tasks={open} projectName={projectName} /><TaskSection title="Avklarat" hint="Klara" tasks={done} projectName={projectName} /></div>}
  </div>
}
