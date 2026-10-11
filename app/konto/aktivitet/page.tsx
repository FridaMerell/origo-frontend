import type { Metadata } from "next";
import { getActivity, verifySession } from "@/app/lib/dal";
import { AktivitetView } from "./aktivitet-view";

export const metadata: Metadata = {
  title: "Aktivitet | Origo",
  description: "Dina senaste actions.",
};

export default async function AktivitetPage() {
  const { user } = await verifySession();
  const activity = await getActivity();
  return <AktivitetView user={user} activity={activity} />;
}
