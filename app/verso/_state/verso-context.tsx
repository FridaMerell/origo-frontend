"use client";

import { createContext, useContext, type ReactNode } from "react";
import { selectFacility } from "@/app/actions/facility";
import type { Booking, Expense, Facility, Venture, VentureTask, VersoUpdate } from "@/app/lib/dal";

type VersoData = { facilities: Facility[]; selectedFacility: Facility | null; yearlyExpenses: number; bookings: Booking[]; ventures: Venture[]; ventureTasks: VentureTask[]; expenses: Expense[]; updates: VersoUpdate[]; };
const EMPTY_DATA: VersoData = { facilities: [], selectedFacility: null, yearlyExpenses: 0, bookings: [], ventures: [], ventureTasks: [], expenses: [], updates: [] };
const VersoContext = createContext<VersoData>(EMPTY_DATA);
export function VersoDataProvider({ children, ...data }: VersoData & { children: ReactNode }) { return <VersoContext.Provider value={data}>{children}</VersoContext.Provider>; }
export function useFacilities() { const { facilities, selectedFacility, yearlyExpenses } = useContext(VersoContext); return { facilities, selectedFacility, yearlyExpenses, selectFacility }; }
export function useBookingData() { return { bookings: useContext(VersoContext).bookings }; }
export function useVentureData() { const { ventures, ventureTasks, expenses } = useContext(VersoContext); return { ventures, ventureTasks, expenses }; }
export function useUpdateData() { return { updates: useContext(VersoContext).updates }; }
