import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { FLUX_PROJECT_COOKIE } from "@/app/lib/config";
import { FluxDataProvider } from "@/app/flux/_state/flux-context";
import { getFluxBoard, getFluxProjects } from "@/app/lib/dal";
import { mergeProjectBoards } from "./merge-project-boards";

export async function AllProjectsTimelineData({ children }: { children: ReactNode }) {
  const [cookieStore, projects] = await Promise.all([cookies(), getFluxProjects()]);
  const boards = await Promise.all(projects.map((project) => getFluxBoard(String(project.id))));
  const selectedId = cookieStore.get(FLUX_PROJECT_COOKIE)?.value;
  const { selectedProject, milestones, tasks, updates, documents, users } = mergeProjectBoards(boards, selectedId);

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
