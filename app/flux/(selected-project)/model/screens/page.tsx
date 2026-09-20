import type { Metadata } from "next";
import { getFluxScreens } from "@/app/lib/dal";
import { getModelProjectId } from "@/app/flux/model/project";
import { ScreensView } from "@/app/flux/model/screens-view";

export const metadata: Metadata = {
  title: "Skärmar | Flux",
  description: "Skärmar och routes",
};

export default async function FluxModelScreensPage() {
  const projectId = await getModelProjectId();
  const screens = projectId === null ? [] : await getFluxScreens({ project: String(projectId) });
  return <ScreensView initialScreens={screens} />;
}
