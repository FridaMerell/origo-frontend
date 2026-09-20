import type { Metadata } from "next";
import { getOnThisDay } from "@/app/lib/dal";
import { getSelectedFacility, resolveSelectedHouse } from "@/app/lib/selected-facility";
import HomeView from "./home-view";

export async function generateMetadata(): Promise<Metadata> {
  const selectedFacility = await getSelectedFacility();

  return {
    title: selectedFacility ? `${selectedFacility.name} | Verso` : "Verso | Origo",
    description: selectedFacility ? `Dashboard för ${selectedFacility.name}` : "Verso - Origo",
  };
}

export default async function VersoPage() {
  const house = await resolveSelectedHouse();
  const onThisDay = house ? await getOnThisDay(house) : null;

  return <HomeView onThisDay={onThisDay} />;
}
