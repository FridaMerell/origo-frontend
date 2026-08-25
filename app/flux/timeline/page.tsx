"use client";

import { Card } from "@/app/components/ui/Card";
import { Avatar } from "@/app/components/ui/Avatar";
import { useFluxProjects, useFluxTasks, useFluxUsers, fluxUserName } from "@/app/lib/flux-context";
import type { FluxTask } from "@/app/lib/dal";

export default function FluxTimelinePage() {
  const projects = useFluxProjects();
  const tasks = useFluxTasks();
  const users = useFluxUsers();

  const byProject = projects.map((project) => {
    const projectTasks = tasks
      .filter((task) => task.project === project.id)
      .slice()
      .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
    return { project, tasks: projectTasks };
  });

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="font-display text-2xl font-semibold text-text">Timeline</h1>
      {byProject.length === 0 && (
        <p className="text-sm text-text-muted">No projects yet.</p>
      )}
      {byProject.map(({ project, tasks: projectTasks }) => (
        <Card key={project.id} className="overflow-hidden p-0">
          <div className="border-b border-border px-4 py-2.5 text-sm font-semibold text-text">
            {project.name}
          </div>
          {projectTasks.length === 0 ? (
            <div className="px-4 py-3 text-sm text-text-muted">No tasks</div>
          ) : (
            projectTasks.map((task: FluxTask) => (
              <div
                key={task.id}
                className="flex items-center justify-between border-b border-border px-4 py-2.5 text-sm last:border-b-0"
              >
                <span className="text-text">{task.title}</span>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {task.assignees.map((id) => (
                      <Avatar key={id} name={fluxUserName(users.get(id), id)} size={18} />
                    ))}
                  </div>
                  <span className="font-mono text-xs text-text-muted">
                    {task.due_date ?? "no due date"}
                  </span>
                </div>
              </div>
            ))
          )}
        </Card>
      ))}
    </div>
  );
}
