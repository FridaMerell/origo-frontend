import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { TEMPUS_ALL_SWEDEN, TEMPUS_GEO_AREA_COOKIE } from "@/app/lib/config";
import { getTempusGeoAreas, getTempusSpecies, getTempusSpeciesCategories } from "@/app/lib/dal";
import { TempusDataProvider } from "@/app/lib/tempus-context";

export async function TempusProviders({ children }: { children: ReactNode }) {
  const [species, categories, geoAreas, cookieStore] = await Promise.all([
    getTempusSpecies(),
    getTempusSpeciesCategories(),
    getTempusGeoAreas(),
    cookies(),
  ]);
  const selectedId = cookieStore.get(TEMPUS_GEO_AREA_COOKIE)?.value;
  const selectedGeoArea = selectedId === TEMPUS_ALL_SWEDEN
    ? null
    : geoAreas.find((geoArea) => geoArea.id === selectedId) ?? geoAreas[0] ?? null;

  return (
    <TempusDataProvider
      species={species}
      categories={categories}
      geoAreas={geoAreas}
      selectedGeoArea={selectedGeoArea}
    >
      {children}
    </TempusDataProvider>
  );
}
