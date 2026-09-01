"use client";

import type { Facility, HouseInvitation, User } from "@/app/lib/dal";
import { KontoShell } from "../konto-shell";
import { HouseSection } from "../house-section";
import { TokenSection } from "../token-section";

export function AnslutningarView({
  user,
  houses,
  invitations,
}: {
  user: User;
  houses: Facility[];
  invitations: HouseInvitation[];
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
      <TokenSection />
    </KontoShell>
  );
}
