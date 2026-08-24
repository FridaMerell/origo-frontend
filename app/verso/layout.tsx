import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { FACILITY_COOKIE } from "@/app/lib/config";
import {
  getAllVentureTasks,
  getBookingRequests,
  getBookings,
  getCheckOuts,
  getExpenses,
  getFacilities,
  getVentures,
} from "@/app/lib/dal";
import { BookingDataProvider } from "@/app/lib/booking-context";
import { FacilityProvider } from "@/app/lib/facility-context";
import { VentureDataProvider } from "@/app/lib/venture-context";
import VersoShell from "./verso-shell";

export default async function VersoLayout({ children }: { children: ReactNode }) {
  const [facilities, bookings, bookingRequests, checkOuts, ventureTasks, expenses] =
    await Promise.all([
      getFacilities(),
      getBookings(),
      getBookingRequests(),
      getCheckOuts(),
      getAllVentureTasks(),
      getExpenses(),
    ]);
  const cookieStore = await cookies();
  const selectedId = cookieStore.get(FACILITY_COOKIE)?.value;
  const selectedFacility =
    facilities.find((facility) => String(facility.id) === selectedId) ?? facilities[0] ?? null;

  const houseVentures = selectedFacility ? await getVentures(selectedFacility.id) : [];
  const houseExpenses = selectedFacility
    ? expenses.filter((expense) => String(expense.house) === String(selectedFacility.id))
    : [];

  return (
    <FacilityProvider facilities={facilities} selectedFacility={selectedFacility}>
      <BookingDataProvider
        bookings={bookings}
        bookingRequests={bookingRequests}
        checkOuts={checkOuts}
      >
        <VentureDataProvider
          ventures={houseVentures}
          ventureTasks={ventureTasks}
          expenses={houseExpenses}
        >
          <VersoShell>{children}</VersoShell>
        </VentureDataProvider>
      </BookingDataProvider>
    </FacilityProvider>
  );
}
