"use client";

import { createContext, useContext } from "react";
import { TEMPUS_ALL_SWEDEN, TEMPUS_GEO_AREA_COOKIE } from "@/app/lib/config";
import type { TempusGeoArea } from "@/app/lib/dal";

type TempusDataContextValue = {
  geoAreas: TempusGeoArea[];
  selectedGeoArea: TempusGeoArea | null;
  selectGeoArea: (id: string | null) => void;
};

const TempusDataContext = createContext<TempusDataContextValue>({
  geoAreas: [],
  selectedGeoArea: null,
  selectGeoArea: () => {},
});

export function TempusDataProvider({
  geoAreas,
  selectedGeoArea,
  children,
}: {
  geoAreas: TempusGeoArea[];
  selectedGeoArea: TempusGeoArea | null;
  children: React.ReactNode;
}) {
  const selectGeoArea = (id: string | null) => {
    document.cookie = `${TEMPUS_GEO_AREA_COOKIE}=${id ?? TEMPUS_ALL_SWEDEN}; path=/; max-age=31536000`;
    window.location.reload();
  };

  return (
    <TempusDataContext.Provider
      value={{ geoAreas, selectedGeoArea, selectGeoArea }}
    >
      {children}
    </TempusDataContext.Provider>
  );
}

export function useTempusGeoAreas() {
  const { geoAreas, selectedGeoArea, selectGeoArea } = useContext(TempusDataContext);
  return { geoAreas, selectedGeoArea, selectGeoArea };
}

export function speciesName(species: { swedish_name?: string; scientific_name: string }): string {
  return species.swedish_name || species.scientific_name;
}
