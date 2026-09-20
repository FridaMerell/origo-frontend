import type { Metadata } from "next";
import { getFluxStackProfile } from "@/app/lib/dal";
import { getModelProjectId } from "@/app/flux/model/project";
import { StackView } from "@/app/flux/model/stack-view";

export const metadata: Metadata = {
  title: "Stack | Flux",
  description: "Stack-profil som styr kodgenereringen",
};

export default async function FluxModelStackPage() {
  const projectId = await getModelProjectId();
  const profile = projectId === null ? null : await getFluxStackProfile(String(projectId));
  return <StackView initialProfile={profile} />;
}
