"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { BookingFormModal } from "@/app/verso/booking-form-modal";
import type { Booking } from "@/app/lib/dal";

const BookingModalContext = createContext<(booking: Booking) => void>(() => {});

export function BookingModalProvider({ children }: { children: ReactNode }) {
  const [booking, setBooking] = useState<Booking | null>(null);

  return (
    <BookingModalContext.Provider value={setBooking}>
      {children}
      <BookingFormModal
        open={booking !== null}
        onClose={() => setBooking(null)}
        booking={booking ?? undefined}
      />
    </BookingModalContext.Provider>
  );
}

export function useOpenBookingModal() {
  return useContext(BookingModalContext);
}
