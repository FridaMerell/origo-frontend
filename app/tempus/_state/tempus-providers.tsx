import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { TEMPUS_ALL_SWEDEN, TEMPUS_GEO_AREA_COOKIE } from "@/app/lib/config";
import { getTempusGeoAreas, getTempusLocales } from "@/app/lib/dal";
import { areaPosition } from "../home/area-position";
import { TempusDataProvider } from "./tempus-context";

export async function TempusProviders({ children }: { children: ReactNode }) {
  const [geoAreas, locales, cookieStore] = await Promise.all([getTempusGeoAreas(), getTempusLocales(), cookies()]);
  const selectedId = cookieStore.get(TEMPUS_GEO_AREA_COOKIE)?.value;
  const selectedGeoArea = selectedId === TEMPUS_ALL_SWEDEN ? null : geoAreas.find((geoArea) => geoArea.id === selectedId) ?? geoAreas[0] ?? null;
  // No client component reads an area's geometry from this context, and it is by
  // far the heaviest part of the list, so it is not sent to the browser. Each
  // area's centre is worked out here and sent as a short string instead.
  const withoutGeometry = (geoArea: (typeof geoAreas)[number]) => ({ ...geoArea, geometry: null });
  const positions: Record<string, string> = {};
  for (const geoArea of geoAreas) {
    const position = areaPosition(geoArea.geometry);
    if (position) positions[geoArea.id] = position;
  }
  return (
    <TempusDataProvider
      geoAreas={geoAreas.map(withoutGeometry)}
      locales={locales}
      selectedGeoArea={selectedGeoArea ? withoutGeometry(selectedGeoArea) : null}
      positions={positions}
    >
      {children}
    </TempusDataProvider>
  );
}
