import type { Metadata } from "next";
import { getFluxSeedRows } from "@/app/lib/dal";
import { getModelProjectId } from "@/app/flux/model/project";
import { SeedView } from "@/app/flux/model/seed-view";

export const metadata: Metadata = {
  title: "Seed-data | Flux",
  description: "Exempeldata per entitet",
};

export default async function FluxModelSeedPage() {
  const projectId = await getModelProjectId();
  const rows = projectId === null ? [] : await getFluxSeedRows({ entity__project: String(projectId) });
  return <SeedView initialRows={rows} />;
}
