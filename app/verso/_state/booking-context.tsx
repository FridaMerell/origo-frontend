"use client";

import { createContext, useContext } from "react";
import type { Booking, BookingRequest, CheckOut } from "@/app/lib/dal";

type BookingDataContextValue = {
  bookings: Booking[];
  bookingRequests: BookingRequest[];
  checkOuts: CheckOut[];
};

const BookingDataContext = createContext<BookingDataContextValue>({
  bookings: [],
  bookingRequests: [],
  checkOuts: [],
});

export function BookingDataProvider({
  bookings,
  bookingRequests,
  checkOuts,
  children,
}: BookingDataContextValue & { children: React.ReactNode }) {
  return (
    <BookingDataContext.Provider value={{ bookings, bookingRequests, checkOuts }}>
      {children}
    </BookingDataContext.Provider>
  );
}

export function useBookingData() {
  return useContext(BookingDataContext);
}
