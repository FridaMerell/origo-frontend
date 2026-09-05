import type { Metadata } from "next";
import { cookies } from "next/headers";
import { FLUX_PROJECT_COOKIE } from "@/app/lib/config";
import { getFluxProjects } from "@/app/lib/dal";
import HomeView from "@/app/flux/home-view"

export async function generateMetadata(): Promise<Metadata> {
  const projects = await getFluxProjects();
  const cookieStore = await cookies();
  const selectedId = cookieStore.get(FLUX_PROJECT_COOKIE)?.value;
  const selectedProject =
    projects.find((project) => String(project.id) === selectedId) ?? projects[0] ?? null;

  return {
    title: selectedProject ? `${selectedProject.name} | Flux` : "Flux | Origo",
    description: selectedProject ? selectedProject.description || selectedProject.name : "Origo",
  };
}

export default function FluxPage() {
  return <HomeView />;
}
