import type { Metadata } from "next";
import { getFluxProject } from "@/app/lib/dal";
import FluxProjectDetailView from "@/app/flux/projects/[id]/project-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = await getFluxProject(id);

  return {
    title: project ? `${project.name} | Flux` : "Projekt | Flux",
    description: project ? project.description || project.name : "Flux-projekt",
  };
}

export default function FluxProjectDetailPage() {
  return <FluxProjectDetailView />;
}
