import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { TEMPUS_ALL_SWEDEN, TEMPUS_GEO_AREA_COOKIE } from "@/app/lib/config";
import { getTempusGeoAreas, getTempusLocales } from "@/app/lib/dal";
import { TempusDataProvider } from "./tempus-context";

export async function TempusProviders({ children }: { children: ReactNode }) {
  const [geoAreas, locales, cookieStore] = await Promise.all([getTempusGeoAreas(), getTempusLocales(), cookies()]);
  const selectedId = cookieStore.get(TEMPUS_GEO_AREA_COOKIE)?.value;
  const selectedGeoArea = selectedId === TEMPUS_ALL_SWEDEN ? null : geoAreas.find((geoArea) => geoArea.id === selectedId) ?? geoAreas[0] ?? null;
  return <TempusDataProvider geoAreas={geoAreas} locales={locales} selectedGeoArea={selectedGeoArea}>{children}</TempusDataProvider>;
}
