import type { Metadata } from "next";
import { verifySession } from "@/app/lib/dal";
import { AccountView } from "./account-view";

export const metadata: Metadata = {
  title: "Konto | Origo",
  description: "Hantera dina kontouppgifter.",
};

export default async function KontoPage() {
  const { user } = await verifySession();
  return <AccountView user={user} />;
}
