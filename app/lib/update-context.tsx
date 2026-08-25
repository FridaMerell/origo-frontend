"use client";

import { createContext, useContext } from "react";
import type { VersoUpdate } from "@/app/lib/dal";

type UpdateDataContextValue = {
  updates: VersoUpdate[];
};

const UpdateDataContext = createContext<UpdateDataContextValue>({
  updates: [],
});

export function UpdateDataProvider({
  updates,
  children,
}: UpdateDataContextValue & { children: React.ReactNode }) {
  return (
    <UpdateDataContext.Provider value={{ updates }}>
      {children}
    </UpdateDataContext.Provider>
  );
}

export function useUpdateData() {
  return useContext(UpdateDataContext);
}
