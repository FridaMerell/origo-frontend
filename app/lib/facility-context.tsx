"use client";

import { createContext, useContext } from "react";
import { FACILITY_COOKIE } from "@/app/lib/config";
import type { Facility } from "@/app/lib/dal";

type FacilityContextValue = {
  facilities: Facility[];
  selectedFacility: Facility | null;
  selectFacility: (id: string) => void;
};

const FacilityContext = createContext<FacilityContextValue>({
  facilities: [],
  selectedFacility: null,
  selectFacility: () => {},
});

export function FacilityProvider({
  facilities,
  selectedFacility,
  children,
}: {
  facilities: Facility[];
  selectedFacility: Facility | null;
  children: React.ReactNode;
}) {
  const selectFacility = (id: string) => {
    document.cookie = `${FACILITY_COOKIE}=${id}; path=/; max-age=31536000`;
    window.location.reload();
  };

  return (
    <FacilityContext.Provider value={{ facilities, selectedFacility, selectFacility }}>
      {children}
    </FacilityContext.Provider>
  );
}

export function useFacilities() {
  return useContext(FacilityContext);
}
