import type { Metadata } from "next";
import {
  getFacilities,
  getFluxProjects,
  getInvitations,
  verifySession,
} from "@/app/lib/dal";
import { AnslutningarView } from "./anslutningar-view";

export const metadata: Metadata = {
  title: "Anslutningar | Origo",
  description: "Hus, inbjudningar och din personliga API-token.",
};

export default async function AnslutningarPage() {
  const { user } = await verifySession();
  const [houses, invitations, projects] = await Promise.all([
    getFacilities(),
    getInvitations(),
    getFluxProjects({ members: String(user.id) }),
  ]);
  return (
    <AnslutningarView
      user={user}
      houses={houses}
      invitations={invitations}
      projects={projects}
    />
  );
}
