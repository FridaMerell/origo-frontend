import type { Metadata } from "next";
import { getFacilities, getHouseInvitations, verifySession } from "@/app/lib/dal";
import { AnslutningarView } from "./anslutningar-view";

export const metadata: Metadata = {
  title: "Anslutningar | Origo",
  description: "Hus, husinbjudningar och din personliga API-token.",
};

export default async function AnslutningarPage() {
  const { user } = await verifySession();
  const [houses, invitations] = await Promise.all([
    getFacilities(),
    getHouseInvitations(),
  ]);
  return <AnslutningarView user={user} houses={houses} invitations={invitations} />;
}
