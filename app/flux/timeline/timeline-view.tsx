"use client";

import { Avatar } from "@/app/components/ui/Avatar";
import { Card } from "@/app/components/ui/Card";
import { ListTable, type ListTableColumn } from "@/app/components/ui/ListTable";
import { useFluxProjects, useFluxTasks, useFluxUsers, fluxUserName } from "@/app/lib/flux-context";
import { useTaskPanel } from "@/app/lib/task-panel-context";
import type { FluxTask, FluxUser } from "@/app/lib/dal";

function buildColumns(users: Map<number, FluxUser>): ListTableColumn<FluxTask>[] {
  return [
    { key: "title", render: (task) => task.title },
    {
      key: "assignees",
      width: "120px",
      align: "right",
      render: (task) => (
        <div className="flex gap-1">
          {task.assignees.map((id) => (
            <Avatar key={id} name={fluxUserName(users.get(id), id)} size={18} />
          ))}
        </div>
      ),
    },
    { key: "due", width: "120px", align: "right", render: (task) => task.due_date ?? "no due date" },
  ];
}

export default function FluxTimelineView() {
  const projects = useFluxProjects();
  const tasks = useFluxTasks();
  const users = useFluxUsers();
  const { openTask } = useTaskPanel();
  const columns = buildColumns(users);

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
      {byProject.length === 0 && <p className="text-sm text-text-muted">No projects yet.</p>}
      {byProject.map(({ project, tasks: projectTasks }) =>
        projectTasks.length === 0 ? (
          <Card key={project.id} className="flex flex-col gap-1 p-0">
            <div className="border-b border-border px-4 py-2.5 text-sm font-semibold text-text">
              {project.name}
            </div>
            <div className="px-4 py-3 text-sm text-text-muted">No tasks</div>
          </Card>
        ) : (
          <ListTable
            key={project.id}
            caption={project.name}
            showHeader={false}
            columns={columns}
            rows={projectTasks.map((task) => ({ id: task.id, item: task }))}
            onRowClick={(task) => openTask(task.id)}
          />
        )
      )}
    </div>
  );
}
