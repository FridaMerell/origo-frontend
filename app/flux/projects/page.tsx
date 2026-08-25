"use client";

import { Card } from "@/app/components/ui/Card";
import { Avatar } from "@/app/components/ui/Avatar";
import { useFluxProjects, useFluxTasks, useFluxUsers, fluxUserName } from "@/app/lib/flux-context";
import { AddProjectButton } from "@/app/flux/projects/add-project-button";
import { DeleteProjectButton } from "@/app/flux/projects/delete-project-button";

export default function FluxProjectsPage() {
  const projects = useFluxProjects();
  const tasks = useFluxTasks();
  const users = useFluxUsers();

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-text">Projects</h1>
        <AddProjectButton />
      </div>
      {projects.length === 0 && (
        <p className="text-sm text-text-muted">No projects yet.</p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => {
          const taskCount = tasks.filter((task) => task.project === project.id).length;
          return (
            <Card key={project.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-base font-semibold text-text">{project.name}</span>
                <DeleteProjectButton id={project.id} />
              </div>
              {project.description && (
                <p className="text-sm text-text-muted">{project.description}</p>
              )}
              <span className="font-mono text-sm text-text-faint">
                {taskCount} task{taskCount === 1 ? "" : "s"}
              </span>
              {project.members.length > 0 && (
                <div className="mt-0.5 flex gap-1.5">
                  {project.members.map((id) => (
                    <Avatar key={id} name={fluxUserName(users.get(id), id)} size={24} />
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
