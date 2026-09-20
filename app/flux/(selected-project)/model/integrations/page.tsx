import type { Metadata } from "next";
import { getFluxIntegrations } from "@/app/lib/dal";
import { getModelProjectId } from "@/app/flux/model/project";
import { IntegrationsView } from "@/app/flux/model/integrations-view";

export const metadata: Metadata = {
  title: "Integrationer | Flux",
  description: "Externa tjänster och hemligheter",
};

export default async function FluxModelIntegrationsPage() {
  const projectId = await getModelProjectId();
  const integrations = projectId === null ? [] : await getFluxIntegrations({ project: String(projectId) });
  return <IntegrationsView initialIntegrations={integrations} />;
}
