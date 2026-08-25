import type { ReactNode } from "react";
import { getFluxMilestones, getFluxProjects, getFluxTasks, getFluxUpdates, getFluxUsers } from "@/app/lib/dal";
import {
  FluxMilestonesProvider,
  FluxProjectsProvider,
  FluxTasksProvider,
  FluxUpdatesProvider,
  FluxUsersProvider,
} from "@/app/lib/flux-context";

export async function FluxProviders({ children }: { children: ReactNode }) {
  const [projects, milestones, tasks, updates] = await Promise.all([
    getFluxProjects(),
    getFluxMilestones(),
    getFluxTasks(),
    getFluxUpdates(),
  ]);

  const userIds = new Set<number>();
  for (const project of projects) for (const id of project.members) userIds.add(id);
  for (const task of tasks) for (const id of task.assignees) userIds.add(id);
  for (const update of updates) if (update.author) userIds.add(update.author);
  const users = await getFluxUsers([...userIds]);

  return (
    <FluxProjectsProvider projects={projects}>
      <FluxMilestonesProvider milestones={milestones}>
        <FluxTasksProvider tasks={tasks}>
          <FluxUpdatesProvider updates={updates}>
            <FluxUsersProvider users={users}>{children}</FluxUsersProvider>
          </FluxUpdatesProvider>
        </FluxTasksProvider>
      </FluxMilestonesProvider>
    </FluxProjectsProvider>
  );
}
