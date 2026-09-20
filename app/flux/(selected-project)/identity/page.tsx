import type { Metadata } from "next";
import { getFluxIdentities } from "@/app/lib/dal";
import { IdentityView } from "@/app/flux/identity/identity-view";

export const metadata: Metadata = {
  title: "Identitet | Flux",
  description: "Visuell identitet för projektet",
};

export default async function FluxIdentityPage() {
  const identities = await getFluxIdentities();
  return <IdentityView initialIdentities={identities} />;
}
