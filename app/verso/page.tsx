import type { Metadata } from "next";
import { getHeatingLogs, getOnThisDay, getResidentialHeating, type HeatingLog } from "@/app/lib/dal";
import { getSelectedFacility } from "@/app/lib/selected-facility";
import HomeView from "./home-view";

const HEATING_WINDOW_MS = 2 * 60 * 60 * 1000;

export async function generateMetadata(): Promise<Metadata> {
  const selectedFacility = await getSelectedFacility();

  return {
    title: selectedFacility ? `${selectedFacility.name} | Verso` : "Verso | Origo",
    description: selectedFacility ? `Dashboard för ${selectedFacility.name}` : "Verso - Origo",
  };
}

/** Logs from the last two hours, read from the newest page of the house's ResidentialHeating proxy. */
async function getRecentHeating(
  house: string
): Promise<{ connection: string; logs: HeatingLog[]; error?: string } | null> {
  const connection = await getResidentialHeating(house);
  if (!connection) return null;
  const { data, error } = await getHeatingLogs(connection.id, 1);
  const since = Date.now() - HEATING_WINDOW_MS;
  return {
    connection: connection.id,
    logs: (data?.results ?? []).filter((log) => new Date(log.timestamp).getTime() >= since),
    error,
  };
}

export default async function VersoPage() {
  const facility = await getSelectedFacility();
  const house = facility?.id ?? null;
  const [onThisDay, heating] = await Promise.all([
    house ? getOnThisDay(house) : null,
    house && facility?.modules?.includes("residential_heating") ? getRecentHeating(house) : null,
  ]);

  return <HomeView onThisDay={onThisDay} heating={heating} />;
}
