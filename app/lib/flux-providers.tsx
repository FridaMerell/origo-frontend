import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { FLUX_PROJECT_COOKIE } from "@/app/lib/config";
import { getFluxMilestones, getFluxProjects, getFluxTasks, getFluxUpdates, getFluxUsers } from "@/app/lib/dal";
import { FluxDataProvider } from "@/app/lib/flux-context";

export async function FluxProviders({ children }: { children: ReactNode }) {
  const projects = await getFluxProjects();
  const cookieStore = await cookies();
  const selectedId = cookieStore.get(FLUX_PROJECT_COOKIE)?.value;
  const selectedProject =
    projects.find((project) => String(project.id) === selectedId) ?? projects[0] ?? null;

  const [milestones, tasks, updates] = selectedProject
    ? await Promise.all([
        getFluxMilestones({ project: String(selectedProject.id) }),
        getFluxTasks({ project: String(selectedProject.id) }),
        getFluxUpdates({ project: String(selectedProject.id) }),
      ])
    : [[], [], []];

  const userIds = new Set<number>();
  for (const project of projects) for (const id of project.members) userIds.add(id);
  for (const task of tasks) for (const id of task.assignees) userIds.add(id);
  for (const update of updates) if (update.author) userIds.add(update.author);
  const users = await getFluxUsers([...userIds]);

  return (
    <FluxDataProvider
      projects={projects}
      selectedProject={selectedProject}
      tasks={tasks}
      milestones={milestones}
      updates={updates}
      users={users}
    >
      {children}
    </FluxDataProvider>
  );
}
