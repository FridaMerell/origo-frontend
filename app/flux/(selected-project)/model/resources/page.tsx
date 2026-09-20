import type { Metadata } from "next";
import { getFluxResources } from "@/app/lib/dal";
import { getModelProjectId } from "@/app/flux/model/project";
import { ResourcesView } from "@/app/flux/model/resources-view";

export const metadata: Metadata = {
  title: "Resurser | Flux",
  description: "API-resurser per entitet",
};

export default async function FluxModelResourcesPage() {
  const projectId = await getModelProjectId();
  const resources = projectId === null ? [] : await getFluxResources({ entity__project: String(projectId) });
  return <ResourcesView initialResources={resources} />;
}
