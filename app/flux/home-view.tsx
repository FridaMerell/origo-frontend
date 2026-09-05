'use client'

import Image from "next/image"
import Link from "next/link"
import { Avatar } from "../components/ui/Avatar"
import {
  ArrowUpRightIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  CircleIcon,
  CompassIcon,
  FolderOpenIcon,
  PlayIcon,
  type LucideIcon,
} from "lucide-react"
import { ProgressBar } from "../components/ui/ProgressBar"
import { EditProjectButton } from "./projects/edit-project-button"
import { AddMilestoneButton } from "./projects/add-milestone-button"
import { TaskDueDate } from "./tasks/task-due-date"
import { TaskStatusBadge } from "./tasks/task-status-badge"
import {
  fluxUserName,
  useFluxMilestones,
  useFluxProjects,
  useFluxTasks,
  useFluxUpdates,
  useFluxUsers,
  useSelectedFluxProject,
} from "./_state/flux-context"
import { useTaskPanel } from "../lib/task-panel-context"
import { progressOf } from "../lib/flux-progress"
import { formatDate } from "../lib/formatters"
import { isTaskOverdue } from "../lib/flux-task-dates"
import { sortFluxTasks } from "./_state/flux-task-sort"
import type { FluxProject, FluxTask, FluxUser } from "../lib/dal"

const TaskList = ({
  tasks,
  users,
  onOpenTask,
}: {
  tasks: FluxTask[]
  users: Map<number, FluxUser>
  onOpenTask: (id: number) => void
}) => {
  const upcoming = sortFluxTasks(tasks.filter((task) => task.status !== "done")).slice(0, 5)

  if (upcoming.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border bg-surface-2/40 px-5 py-12 text-center">
        <CheckCircle2Icon size={28} className="text-success" />
        <p className="text-sm font-medium text-text">Allt är klart för tillfället.</p>
        <Link href="/tasks" className="text-sm font-medium text-link hover:underline">Se alla uppgifter</Link>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border overflow-hidden rounded-card border border-border">
      {upcoming.map((task) => (
        <button
          key={task.id}
          type="button"
          onClick={() => onOpenTask(task.id)}
          className={["group flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2", isTaskOverdue(task.due_date, task.status) ? "border-l-2 border-l-danger bg-danger-wash/25 pl-[14px]" : ""].join(" ")}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-text-muted group-hover:bg-surface">
            {task.status === "in_progress" ? <PlayIcon size={15} /> : <CircleIcon size={15} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-text">{task.title}</span>
            <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <TaskDueDate dueDate={task.due_date} status={task.status} compact className="text-xs" />
              <span className="hidden sm:inline"><TaskStatusBadge status={task.status} /></span>
            </span>
          </span>
          {task.assignees.length > 0 && (
            <span className="flex shrink-0 -space-x-1.5">
              {task.assignees.map((id) => (
                <Avatar key={id} name={fluxUserName(users.get(id), id)} size={24} />
              ))}
            </span>
          )}
          <ChevronRightIcon size={18} className="shrink-0 text-text-faint group-hover:text-text" />
        </button>
      ))}
    </div>
  )
}

const ProjectSummary = ({ project, tasks, users }: { project: FluxProject; tasks: FluxTask[]; users: Map<number, FluxUser> }) => {
  const progress = progressOf(tasks)

  return (
    <section className="relative isolate overflow-hidden rounded-card bg-[#25263B] px-6 py-5 text-[#FFF9F0] shadow-lg sm:px-8 sm:py-6">
      <Image src="/flux/dragonfly.svg" alt="" aria-hidden width={1774} height={887} className="pointer-events-none absolute -right-40 -top-16 z-0 h-72 w-auto rotate-[-22deg] scale-x-[-1] opacity-35" style={{ filter: "brightness(0) saturate(100%) invert(64%) sepia(45%) saturate(821%) hue-rotate(343deg) brightness(92%) contrast(89%)" }} />
      <div className="relative z-10 grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 [&_button]:text-[#EFA052] [&_button:hover]:text-[#FFF9F0]">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#EFA052]">Projektöversikt</span>
            <EditProjectButton project={project} />
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[#FFF9F0] sm:text-3xl">{project.name}</h1>
          {project.description && <p className="mt-1 max-w-2xl truncate text-sm leading-5 text-[#FFF9F0]/70">{project.description}</p>}
        </div>
        <Link href={"/projects/" + project.id} className="inline-flex h-fit items-center justify-self-start gap-1.5 rounded-md border border-[#FFF9F0]/35 bg-white/5 px-3 py-2 text-sm font-medium text-[#FFF9F0] no-underline transition-colors hover:border-[#EFA052] hover:bg-[#EFA052] hover:text-[#25263B] sm:justify-self-end">
          Projektsida <ArrowUpRightIcon size={15} />
        </Link>
      </div>
      <div className="relative z-10 mt-4 grid gap-x-4 gap-y-3 border-t border-[#FFF9F0]/15 pt-4 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:items-center">
        <span className="text-sm font-medium text-[#FFF9F0]">Projektstatus</span>
        <ProgressBar pct={progress.pct} className="bg-white/15 [&>div]:bg-[#EFA052]" />
        <span className="font-mono text-xs text-[#FFF9F0]/70">{progress.done} av {progress.total} uppgifter klara</span>
        {project.members.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#FFF9F0]/70">Team</span>
            <div className="flex -space-x-1.5">
              {project.members.map((id) => <Avatar key={id} name={fluxUserName(users.get(id), id)} size={26} />)}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

const ProjectPulse = ({ projectId, milestones, tasks, updates, users }: { projectId: number; milestones: ReturnType<typeof useFluxMilestones>; tasks: FluxTask[]; updates: ReturnType<typeof useFluxUpdates>; users: Map<number, FluxUser> }) => (
  <section className="border-t border-border pt-8">
    <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-faint">Projektpuls</p><h2 className="mt-1 text-xl font-semibold text-text">Delmål och aktivitet</h2></div><AddMilestoneButton projectId={projectId} /></div>
    <div className="mt-7 border-l border-border pl-7">
      {milestones.slice(0, 3).map((milestone) => {
        const progress = progressOf(tasks.filter((task) => task.milestone === milestone.id))
        const related = updates.filter((update) => update.milestone === milestone.id).slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 2)
        return <div key={milestone.id} className="relative pb-10 last:pb-0"><span className="absolute -left-[35px] top-1 size-3 rounded-full bg-secondary ring-4 ring-bg" /><Link href={"/projects/" + projectId} className="no-underline"><div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"><h3 className="text-base font-semibold text-text">{milestone.title}</h3><span className="font-mono text-xs text-text-faint">{milestone.target_date ? formatDate(milestone.target_date) : "Ingen deadline"}</span></div><ProgressBar pct={progress.pct} className="mt-3 max-w-sm [&>div]:bg-secondary" /></Link>{related.length > 0 && <div className="mt-5 space-y-4">{related.map((update) => <div key={update.id} className="flex gap-3"><Avatar name={update.author != null ? fluxUserName(users.get(update.author), update.author) : "Systemet"} size={22} /><div><p className="text-sm leading-6 text-text">{update.content}</p><span className="mt-1 block text-xs text-text-faint">{formatDate(update.created_at)}</span></div></div>)}</div>}</div>
      })}
      {milestones.length === 0 && <p className="text-sm text-text-muted">Inga delmål har lagts till ännu.</p>}
    </div>
  </section>
)

const HomeEmpty = ({ icon: IconComponent, title, body }: { icon: LucideIcon; title: string; body: string }) => (
  <section className="relative isolate overflow-hidden rounded-card bg-[#25263B] px-6 py-16 text-center text-[#FFF9F0] shadow-lg sm:px-10 sm:py-20">
    <Image
      src="/flux/dragonfly.svg"
      alt=""
      aria-hidden
      width={1774}
      height={887}
      className="pointer-events-none absolute -right-40 -top-16 z-0 h-72 w-auto rotate-[-22deg] scale-x-[-1] opacity-30"
      style={{ filter: "brightness(0) saturate(100%) invert(64%) sepia(45%) saturate(821%) hue-rotate(343deg) brightness(92%) contrast(89%)" }}
    />
    <div className="relative z-10 mx-auto flex max-w-md flex-col items-center">
      <span className="flex size-12 items-center justify-center rounded-full border border-[#FFF9F0]/25 text-[#EFA052]">
        <IconComponent size={20} />
      </span>
      <h1 className="mt-5 font-display text-2xl font-semibold uppercase tracking-[0.12em] text-[#FFF9F0] sm:text-3xl">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-[#FFF9F0]/70">{body}</p>
    </div>
  </section>
)

export default function HomeView() {
  const projects = useFluxProjects()
  const { selectedProject } = useSelectedFluxProject()
  const tasks = useFluxTasks()
  const milestones = useFluxMilestones()
  const updates = useFluxUpdates()
  const users = useFluxUsers()
  const { openTask } = useTaskPanel()

  if (!projects?.length)
    return (
      <div className="py-10 sm:py-16">
        <HomeEmpty
          icon={FolderOpenIcon}
          title="Inga projekt"
          body="Du har inga projekt än. Kontakta din administratör för att bli tillagd i ett projekt."
        />
      </div>
    )
  if (!selectedProject)
    return (
      <div className="py-10 sm:py-16">
        <HomeEmpty
          icon={CompassIcon}
          title="Välj ett projekt"
          body="Välj ett projekt i menyn högst upp för att se översikten."
        />
      </div>
    )

  return (
    <div className="flex w-full flex-col gap-9 pb-12">
      <ProjectSummary project={selectedProject} tasks={tasks} users={users} />
      <div className="flex flex-col gap-10">
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-faint">Arbetsyta</p><h2 className="mt-1 text-lg font-semibold text-text">Öppna uppgifter</h2></div>
            <Link href="/tasks" className="text-sm font-medium text-link hover:underline">Alla uppgifter</Link>
          </div>
          <TaskList tasks={tasks} users={users} onOpenTask={openTask} />
        </section>
        <ProjectPulse projectId={selectedProject.id} milestones={milestones} tasks={tasks} updates={updates} users={users} />
      </div>
    </div>
  )
}
