import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { FLUX_PROJECT_COOKIE } from "@/app/lib/config";
import { FluxDataProvider } from "@/app/flux/_state/flux-context";
import { getFluxTimeline } from "@/app/lib/dal";

export async function AllProjectsTimelineData({ children }: { children: ReactNode }) {
  const [cookieStore, timeline] = await Promise.all([cookies(), getFluxTimeline()]);
  const projects = timeline?.projects ?? [];
  const selectedId = cookieStore.get(FLUX_PROJECT_COOKIE)?.value;
  const selectedProject =
    projects.find((project) => String(project.id) === selectedId) ?? projects[0] ?? null;

  return (
    <FluxDataProvider
      scope="all-projects"
      projects={projects}
      selectedProject={selectedProject}
      tasks={timeline?.tasks ?? []}
      milestones={timeline?.milestones ?? []}
      updates={timeline?.updates ?? []}
      documents={timeline?.documents ?? []}
      users={timeline?.users ?? []}
    >
      {children}
    </FluxDataProvider>
  );
}
