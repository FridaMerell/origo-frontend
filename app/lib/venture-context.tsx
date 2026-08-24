"use client";

import { createContext, useContext } from "react";
import type { Expense, Venture, VentureTask } from "@/app/lib/dal";

type VentureDataContextValue = {
  ventures: Venture[];
  ventureTasks: VentureTask[];
  expenses: Expense[];
};

const VentureDataContext = createContext<VentureDataContextValue>({
  ventures: [],
  ventureTasks: [],
  expenses: [],
});

export function VentureDataProvider({
  ventures,
  ventureTasks,
  expenses,
  children,
}: VentureDataContextValue & { children: React.ReactNode }) {
  return (
    <VentureDataContext.Provider value={{ ventures, ventureTasks, expenses }}>
      {children}
    </VentureDataContext.Provider>
  );
}

export function useVentureData() {
  return useContext(VentureDataContext);
}
