"use client";

import { Card } from "@/app/components/ui/Card";
import { Avatar } from "@/app/components/ui/Avatar";
import { useFluxProjects, useFluxTasks, useFluxUsers, fluxUserName } from "@/app/lib/flux-context";
import type { FluxTaskPriority } from "@/app/lib/dal";

const COLUMNS: { label: string; priority: FluxTaskPriority }[] = [
  { label: "High priority", priority: "high" },
  { label: "Medium priority", priority: "medium" },
  { label: "Low priority", priority: "low" },
];

export default function FluxBacklogPage() {
  const projects = useFluxProjects();
  const tasks = useFluxTasks();
  const users = useFluxUsers();
  const projectName = (id: number) => projects.find((p) => p.id === id)?.name ?? "—";

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="font-display text-2xl font-semibold text-text">Backlog</h1>
      <div className="flex items-start gap-4">
        {COLUMNS.map(({ label, priority }) => {
          const columnTasks = tasks.filter((task) => task.priority === priority);
          return (
            <div key={priority} className="flex flex-1 flex-col gap-2.5">
              <div className="text-xs font-bold uppercase tracking-wide text-text-muted">
                {label} · {columnTasks.length}
              </div>
              {columnTasks.map((task) => (
                <Card key={task.id} className="flex flex-col gap-2 p-3">
                  <span className="text-sm text-text">{task.title}</span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">{projectName(task.project)}</span>
                    <div className="flex gap-1">
                      {task.assignees.map((id) => (
                        <Avatar key={id} name={fluxUserName(users.get(id), id)} size={18} />
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
