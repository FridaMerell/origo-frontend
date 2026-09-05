import type { Metadata } from "next";
import { cookies } from "next/headers";
import { FACILITY_COOKIE } from "@/app/lib/config";
import { getFacilities } from "@/app/lib/dal";
import HomeView from "./home-view"

export async function generateMetadata(): Promise<Metadata> {
  const facilities = await getFacilities();
  const cookieStore = await cookies();
  const selectedId = cookieStore.get(FACILITY_COOKIE)?.value;
  const selectedFacility =
    facilities.find((facility) => String(facility.id) === selectedId) ?? facilities[0] ?? null;

  return {
    title: selectedFacility ? `${selectedFacility.name} | Verso` : "Verso | Origo",
    description: selectedFacility ? `Dashboard för ${selectedFacility.name}` : "Verso - Origo",
  };
}

export default async function VersoPage() {
  return <HomeView />;
}
