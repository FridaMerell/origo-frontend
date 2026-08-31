'use client'

import Link from "next/link"
import { Card } from "../components/ui/Card"
import { Icon } from "../components/ui/Icon"
import { Avatar } from "../components/ui/Avatar"
import { ProgressBar } from "../components/ui/ProgressBar"
import { EditProjectButton } from "./projects/edit-project-button"
import { AddMilestoneButton } from "./projects/add-milestone-button"
import { TaskDueDate } from "./tasks/task-due-date"
import {
  useFluxProjects,
  useSelectedFluxProject,
  useFluxTasks,
  useFluxMilestones,
  useFluxUpdates,
  useFluxUsers,
  fluxUserName,
} from "../lib/flux-context"
import { useTaskPanel } from "../lib/task-panel-context"
import { progressOf } from "../lib/flux-progress"
import { formatDate } from "../lib/format-date"
import { isTaskOverdue } from "../lib/flux-task-dates"
import type { FluxProject, FluxTask, FluxUser } from "../lib/dal"

const ProjectOverviewCard = ({
  project,
  tasks,
  users,
}: {
  project: FluxProject
  tasks: FluxTask[]
  users: Map<number, FluxUser>
}) => {
  const progress = progressOf(tasks)
  return (
    <Card className="col-span-6 flex w-full flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="m-0 font-display text-2xl font-semibold text-text">{project.name}</h1>
          <EditProjectButton project={project} />
        </div>
        <Link href={`/projects/${project.id}`} className="text-sm text-accent hover:underline">
          Öppna projekt
        </Link>
      </div>
      {project.description && <p className="text-sm text-text-muted">{project.description}</p>}
      <div className="flex flex-wrap items-center gap-4">
        {project.members.length > 0 && (
          <div className="flex gap-1.5">
            {project.members.map((id) => (
              <Avatar key={id} name={fluxUserName(users.get(id), id)} size={26} />
            ))}
          </div>
        )}
        <ProgressBar pct={progress.pct} width={220} />
        <span className="font-mono text-xs text-text-faint">
          {progress.done}/{progress.total} uppgifter klara
        </span>
      </div>
    </Card>
  )
}

const MilestonesCard = ({
  projectId,
  milestones,
  tasks,
}: {
  projectId: number
  milestones: ReturnType<typeof useFluxMilestones>
  tasks: FluxTask[]
}) => {
  return (
    <Card className="col-span-6 flex w-full flex-col gap-3 md:col-span-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-faint">Delmål</span>
        <AddMilestoneButton projectId={projectId} />
      </div>
      {milestones.length === 0 ? (
        <div className="text-sm text-text-muted">Inga delmål än.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {milestones.map((milestone) => {
            const milestoneTasks = tasks.filter((task) => task.milestone === milestone.id)
            const progress = progressOf(milestoneTasks)
            return (
              <Link
                key={milestone.id}
                href={`/projects/${projectId}`}
                className="flex items-center justify-between gap-3 rounded border border-border px-3 py-2 text-text no-underline hover:bg-surface-2"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Icon name="flag" size={14} className="shrink-0 text-text-muted" />
                  <span className="truncate text-sm">{milestone.title}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-xs text-text-faint">
                    {milestone.target_date ? formatDate(milestone.target_date) : "Ingen deadline"}
                  </span>
                  <ProgressBar pct={progress.pct} width={80} className="hidden sm:block" />
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </Card>
  )
}

const UpcomingTasksCard = ({
  tasks,
  users,
  onOpenTask,
}: {
  tasks: FluxTask[]
  users: Map<number, FluxUser>
  onOpenTask: (id: number) => void
}) => {
  const upcoming = tasks
    .filter((task) => task.status !== "done")
    .slice()
    .sort((a, b) => (a.due_date ?? "9999-99-99").localeCompare(b.due_date ?? "9999-99-99"))
    .slice(0, 5)

  return (
    <Card className="col-span-6 flex w-full flex-col gap-3 md:col-span-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-text-faint">Kommande uppgifter</span>
      {upcoming.length === 0 ? (
        <div className="text-sm text-text-muted">Inga öppna uppgifter.</div>
      ) : (
        <div className="flex flex-col overflow-hidden rounded border border-border">
          {upcoming.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => onOpenTask(task.id)}
              className={`flex items-center justify-between gap-3 border-b border-border px-3 py-2 text-left text-sm text-text last:border-b-0 ${isTaskOverdue(task.due_date, task.status) ? "bg-danger-wash/20 hover:bg-danger-wash/30" : "hover:bg-surface-2"}`}
            >
              <span className="min-w-0 truncate">{task.title}</span>
              <span className="flex shrink-0 items-center gap-2">
                <TaskDueDate dueDate={task.due_date} status={task.status} compact className="shrink-0" />
                <span className="flex gap-1">
                  {task.assignees.map((id) => (
                    <Avatar key={id} name={fluxUserName(users.get(id), id)} size={18} />
                  ))}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}

const UpdatesCard = ({
  updates,
  users,
}: {
  updates: ReturnType<typeof useFluxUpdates>
  users: Map<number, FluxUser>
}) => {
  const recent = updates
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5)

  return (
    <Card className="col-span-6 flex w-full flex-col gap-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-text-faint">Senaste uppdateringar</span>
      {recent.length === 0 ? (
        <div className="text-sm text-text-muted">Inga uppdateringar än.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {recent.map((update) => (
            <div key={update.id} className="flex items-start gap-3">
              <Avatar
                name={update.author != null ? fluxUserName(users.get(update.author), update.author) : "Systemet"}
                size={28}
              />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm text-text">{update.content}</span>
                <span className="text-xs text-text-faint">{formatDate(update.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

const Home = () => {
  const projects = useFluxProjects()
  const { selectedProject } = useSelectedFluxProject()
  const tasks = useFluxTasks()
  const milestones = useFluxMilestones()
  const updates = useFluxUpdates()
  const users = useFluxUsers()
  const { openTask } = useTaskPanel()

  if (!projects || projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center">
        <h1 className="font-display text-2xl font-semibold text-text">Inga projekt</h1>
        <p className="text-sm text-text-muted">
          Du har inga projekt än. Kontakta din administratör för att bli tillagd i ett projekt.
        </p>
      </div>
    )
  }

  if (!selectedProject) {
    return (
      <div className="flex flex-col items-center justify-center">
        <div>Välj ett projekt</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-6 gap-4">
        <ProjectOverviewCard project={selectedProject} tasks={tasks} users={users} />
        <MilestonesCard projectId={selectedProject.id} milestones={milestones} tasks={tasks} />
        <UpcomingTasksCard tasks={tasks} users={users} onOpenTask={openTask} />
        <UpdatesCard updates={updates} users={users} />
      </div>
    </div>
  )
}

export default Home
