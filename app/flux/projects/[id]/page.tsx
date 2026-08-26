import type { Metadata } from "next";
import { getFluxProject } from "@/app/lib/dal";
import FluxProjectDetailView from "./project-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = await getFluxProject(id);

  return {
    title: project ? `${project.name} | Flux` : "Project | Flux",
    description: project ? project.description || project.name : "Flux project",
  };
}

export default function FluxProjectDetailPage() {
  return <FluxProjectDetailView />;
}
