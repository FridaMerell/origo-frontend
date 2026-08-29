"use client";

import { createContext, useContext } from "react";
import { TEMPUS_ALL_SWEDEN, TEMPUS_GEO_AREA_COOKIE } from "@/app/lib/config";
import type { TempusGeoArea, TempusSpecies, TempusSpeciesCategory } from "@/app/lib/dal";

type TempusDataContextValue = {
  species: TempusSpecies[];
  categories: TempusSpeciesCategory[];
  speciesById: Map<string, TempusSpecies>;
  geoAreas: TempusGeoArea[];
  selectedGeoArea: TempusGeoArea | null;
  selectGeoArea: (id: string | null) => void;
};

const TempusDataContext = createContext<TempusDataContextValue>({
  species: [],
  categories: [],
  speciesById: new Map(),
  geoAreas: [],
  selectedGeoArea: null,
  selectGeoArea: () => {},
});

export function TempusDataProvider({
  species,
  categories,
  geoAreas,
  selectedGeoArea,
  children,
}: {
  species: TempusSpecies[];
  categories: TempusSpeciesCategory[];
  geoAreas: TempusGeoArea[];
  selectedGeoArea: TempusGeoArea | null;
  children: React.ReactNode;
}) {
  const speciesById = new Map(species.map((item) => [item.id, item]));
  const selectGeoArea = (id: string | null) => {
    document.cookie = `${TEMPUS_GEO_AREA_COOKIE}=${id ?? TEMPUS_ALL_SWEDEN}; path=/; max-age=31536000`;
    window.location.reload();
  };

  return (
    <TempusDataContext.Provider
      value={{ species, categories, speciesById, geoAreas, selectedGeoArea, selectGeoArea }}
    >
      {children}
    </TempusDataContext.Provider>
  );
}

export function useTempusSpecies() {
  return useContext(TempusDataContext).species;
}

export function useTempusSpeciesCategories() {
  return useContext(TempusDataContext).categories;
}

export function useTempusSpeciesById() {
  return useContext(TempusDataContext).speciesById;
}

export function useTempusGeoAreas() {
  const { geoAreas, selectedGeoArea, selectGeoArea } = useContext(TempusDataContext);
  return { geoAreas, selectedGeoArea, selectGeoArea };
}

export function speciesName(species: { swedish_name?: string; scientific_name: string }): string {
  return species.swedish_name || species.scientific_name;
}

export function speciesLabel(
  speciesById: Map<string, TempusSpecies>,
  id: string | null | undefined,
): string {
  if (!id) return "Okänd art";
  const species = speciesById.get(id);
  return species ? speciesName(species) : "Okänd art";
}
