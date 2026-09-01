import type { Metadata } from "next";
import { getCurrentUser } from "@/app/lib/dal";
import { JoinView } from "./join-view";

export const metadata: Metadata = {
  title: "Gå med | Origo",
  description: "Lös in en husinbjudan.",
};

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const user = await getCurrentUser();
  return (
    <JoinView
      token={typeof token === "string" ? token : ""}
      username={user?.username ?? null}
    />
  );
}
