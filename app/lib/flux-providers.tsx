import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { FLUX_PROJECT_COOKIE } from "@/app/lib/config";
import { getCurrentUser, getFluxDocuments, getFluxMilestones, getFluxProjects, getFluxTasks, getFluxUpdates, getFluxUsers } from "@/app/lib/dal";
import { FluxDataProvider } from "@/app/lib/flux-context";

export async function FluxProviders({ children }: { children: ReactNode }) {
  const [projects, currentUser] = await Promise.all([getFluxProjects(), getCurrentUser()]);
  const cookieStore = await cookies();
  const selectedId = cookieStore.get(FLUX_PROJECT_COOKIE)?.value;
  const selectedProject =
    projects.find((project) => String(project.id) === selectedId) ?? projects[0] ?? null;

  const projectId = selectedProject ? String(selectedProject.id) : undefined;
  const [milestones, tasks, updates, documents] = projectId
    ? await Promise.all([
        getFluxMilestones({ project: projectId }),
        getFluxTasks({ project: projectId }),
        getFluxUpdates({ project: projectId }),
        getFluxDocuments({ project: projectId }),
      ])
    : [[], [], [], []];

  const userIds = new Set<number>();
  for (const project of projects) for (const id of project.members) userIds.add(id);
  for (const task of tasks) for (const id of task.assignees) userIds.add(id);
  for (const update of updates) if (update.author) userIds.add(update.author);
  if (currentUser) userIds.add(currentUser.id);

  const fetchedUsers = await getFluxUsers([...userIds]);
  // The accounts list may be filtered by project membership. The session user
  // is already trusted server-side, so keep it available for their own avatar.
  const users = currentUser && !fetchedUsers.some((user) => user.id === currentUser.id)
    ? [currentUser, ...fetchedUsers]
    : fetchedUsers;

  return (
    <FluxDataProvider
      projects={projects}
      selectedProject={selectedProject}
      tasks={tasks}
      milestones={milestones}
      updates={updates}
      documents={documents}
      users={users}
    >
      {children}
    </FluxDataProvider>
  );
}
