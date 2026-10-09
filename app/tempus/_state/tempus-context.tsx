"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { TEMPUS_ALL_SWEDEN, TEMPUS_GEO_AREA_COOKIE } from "@/app/lib/config";
import type { TempusGeoArea, TempusLocale } from "@/app/lib/dal";

type TempusDataContextValue = {
  geoAreas: TempusGeoArea[];
  locales: TempusLocale[];
  selectedGeoArea: TempusGeoArea | null;
  selectGeoArea: (id: string | null) => void;
  // Each area's centre as coordinates, by area id.
  positions: Record<string, string>;
  // The area the pointer rests on in the area list, if any.
  previewedGeoAreaId: string | null;
  previewGeoArea: (id: string | null) => void;
};

const TempusDataContext = createContext<TempusDataContextValue>({
  geoAreas: [],
  locales: [],
  selectedGeoArea: null,
  selectGeoArea: () => {},
  positions: {},
  previewedGeoAreaId: null,
  previewGeoArea: () => {},
});

export function TempusDataProvider({
  geoAreas,
  locales,
  selectedGeoArea,
  positions,
  children,
}: {
  geoAreas: TempusGeoArea[];
  locales: TempusLocale[];
  selectedGeoArea: TempusGeoArea | null;
  positions: Record<string, string>;
  children: React.ReactNode;
}) {
  const [previewedGeoAreaId, previewGeoArea] = useState<string | null>(null);
  const value = useMemo(() => {
    const selectGeoArea = (id: string | null) => {
      document.cookie = `${TEMPUS_GEO_AREA_COOKIE}=${id ?? TEMPUS_ALL_SWEDEN}; path=/; max-age=31536000`;
      window.location.reload();
    };
    return { geoAreas, locales, selectedGeoArea, selectGeoArea, positions, previewedGeoAreaId, previewGeoArea };
  }, [geoAreas, locales, selectedGeoArea, positions, previewedGeoAreaId]);

  return <TempusDataContext.Provider value={value}>{children}</TempusDataContext.Provider>;
}

export function useTempusGeoAreas() {
  const { geoAreas, selectedGeoArea, selectGeoArea, previewGeoArea } = useContext(TempusDataContext);
  return { geoAreas, selectedGeoArea, selectGeoArea, previewGeoArea };
}

// The coordinates of the area the pointer rests on in the area list, or null.
export function useTempusPreviewedPosition(): string | null {
  const { positions, previewedGeoAreaId } = useContext(TempusDataContext);
  return previewedGeoAreaId ? positions[previewedGeoAreaId] ?? null : null;
}

export function useTempusLocales() {
  return useContext(TempusDataContext).locales;
}

export function speciesName(species: { swedish_name?: string; scientific_name: string }): string {
  return species.swedish_name || species.scientific_name;
}
