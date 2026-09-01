"use client";

import type { Facility, FluxProject, Invitation, User } from "@/app/lib/dal";
import { KontoShell } from "../konto-shell";
import { HouseSection } from "../house-section";
import { ConnectionInvitations } from "../connection-invitations";
import { TokenSection } from "../token-section";

export function AnslutningarView({
  user,
  houses,
  invitations,
  projects,
}: {
  user: User;
  houses: Facility[];
  invitations: Invitation[];
  projects: FluxProject[];
}) {
  return (
    <KontoShell
      backHref="/konto"
      backLabel="Konto"
      kicker="Konto"
      title="Anslutningar"
      username={user.username}
    >
      <HouseSection houses={houses} invitations={invitations} />
      <ConnectionInvitations invitations={invitations} projects={projects} />
      <TokenSection />
    </KontoShell>
  );
}
