"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { BookingFormDrawer } from "@/app/verso/booking-form-drawer";
import type { Booking } from "@/app/lib/dal";

const BookingDrawerContext = createContext<(booking: Booking) => void>(() => {});

export function BookingDrawerProvider({ children }: { children: ReactNode }) {
  const [booking, setBooking] = useState<Booking | null>(null);

  return (
    <BookingDrawerContext.Provider value={setBooking}>
      {children}
      <BookingFormDrawer
        open={booking !== null}
        onClose={() => setBooking(null)}
        booking={booking ?? undefined}
      />
    </BookingDrawerContext.Provider>
  );
}

export function useOpenBookingDrawer() {
  return useContext(BookingDrawerContext);
}
