"use client"

import Link from "next/link"
import { Avatar } from "@/app/components/ui/Avatar"
import { Card } from "@/app/components/ui/Card"
import { Icon } from "@/app/components/ui/Icon"
import { ProgressBar } from "@/app/components/ui/ProgressBar"
import { AddProjectButton } from "@/app/flux/projects/add-project-button"
import { DeleteProjectButton } from "@/app/flux/projects/delete-project-button"
import { fluxUserName, useFluxProjects, useFluxTasks, useFluxUsers } from "@/app/lib/flux-context"
import { progressOf } from "@/app/lib/flux-progress"

export default function FluxProjectsView() {
  const projects = useFluxProjects()
  const tasks = useFluxTasks()
  const users = useFluxUsers()

  return <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 pb-12">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-faint">Arbetsyta</p><h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-text">Projekt</h1><p className="mt-2 text-sm text-text-muted">Överblick över pågående och avslutade arbeten.</p></div><AddProjectButton /></header>
    {projects.length === 0 ? <Card className="text-sm text-text-muted">Inga projekt än.</Card> : <div className="flex flex-col border-t border-border">
      {projects.map((project, index) => {
        const projectTasks = tasks.filter((task) => task.project === project.id)
        const progress = progressOf(projectTasks)
        return <div key={project.id} className="group flex items-start gap-4 border-b border-border py-5 sm:gap-6">
          <span className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-wash font-display text-sm font-semibold text-accent">{String(index + 1).padStart(2, "0")}</span>
          <Link href={"/projects/" + project.id} className="min-w-0 flex-1 no-underline">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2"><h2 className="text-lg font-semibold text-text">{project.name}</h2><span className="font-mono text-xs text-text-faint">{progress.total > 0 ? progress.done + " / " + progress.total + " klara" : "Inga uppgifter ännu"}</span></div>
            {project.description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-text-muted">{project.description}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2"><div className="w-40"><ProgressBar pct={progress.pct} /></div><span className="text-xs text-text-faint">{projectTasks.length} {projectTasks.length === 1 ? "uppgift" : "uppgifter"}</span>{project.members.length > 0 && <div className="flex -space-x-1.5">{project.members.map((id) => <Avatar key={id} name={fluxUserName(users.get(id), id)} size={24} />)}</div>}<span className="inline-flex items-center gap-1 text-sm font-medium text-link">Öppna projekt <Icon name="arrow-up-right" size={15} /></span></div>
          </Link>
          <div className="shrink-0 pt-1"><DeleteProjectButton id={project.id} /></div>
        </div>
      })}
    </div>}
  </div>
}
