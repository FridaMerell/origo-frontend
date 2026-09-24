"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { BookingFormDrawer } from "@/app/verso/forms/booking-form-drawer";
import type { Booking } from "@/app/lib/dal";

type DrawerState = { open: boolean; session: number; booking?: Booking };
type BookingDrawerActions = { openNew: () => void; openEdit: (booking: Booking) => void; };
const BookingDrawerContext = createContext<BookingDrawerActions>({ openNew: () => {}, openEdit: () => {} });

export function BookingDrawerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DrawerState>({ open: false, session: 0 });
  const actions: BookingDrawerActions = { openNew: () => setState((s) => ({ open: true, session: s.session + 1 })), openEdit: (booking) => setState((s) => ({ open: true, session: s.session + 1, booking })) };
  return <BookingDrawerContext.Provider value={actions}>{children}<BookingFormDrawer key={state.session} open={state.open} onClose={() => setState((s) => ({ ...s, open: false }))} booking={state.booking} /></BookingDrawerContext.Provider>;
}
export function useBookingDrawer() { return useContext(BookingDrawerContext); }
