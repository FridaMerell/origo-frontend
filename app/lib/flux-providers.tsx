import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { FLUX_PROJECT_COOKIE } from "@/app/lib/config";
import { getFluxBoard, getFluxProjects } from "@/app/lib/dal";
import { FluxDataProvider } from "@/app/lib/flux-context";

export async function FluxProviders({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const selectedId = cookieStore.get(FLUX_PROJECT_COOKIE)?.value;
  let board = selectedId ? await getFluxBoard(selectedId) : null;
  if (!board) {
    const projects = await getFluxProjects();
    const firstProject = projects[0];
    board = firstProject ? await getFluxBoard(String(firstProject.id)) : null;
  }

  const projects = board?.projects ?? [];
  const selectedProject = board?.project ?? null;
  const milestones = board?.milestones ?? [];
  const tasks = board?.tasks ?? [];
  const updates = board?.updates ?? [];
  const documents = board?.documents ?? [];
  const users = board?.users ?? [];

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
