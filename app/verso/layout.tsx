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
  getVersoUpdates,
  getYearlyExpenses,
} from "@/app/lib/dal";
import { BookingDataProvider } from "@/app/lib/booking-context";
import { FacilityProvider } from "@/app/lib/facility-context";
import { VentureDataProvider } from "@/app/lib/venture-context";
import { UpdateDataProvider } from "@/app/lib/update-context";
import VersoShell from "./verso-shell";

export default async function VersoLayout({ children }: { children: ReactNode }) {
  const [facilities, allCheckOuts, ventureTasks, allUpdates] = await Promise.all([
    getFacilities(),
    getCheckOuts(),
    getAllVentureTasks(),
    getVersoUpdates(),
  ]);
  const cookieStore = await cookies();
  const selectedId = cookieStore.get(FACILITY_COOKIE)?.value;
  const selectedFacility =
    facilities.find((facility) => String(facility.id) === selectedId) ?? facilities[0] ?? null;

  const [bookings, bookingRequests, houseVentures, houseExpenses, yearlyExpenses] = selectedFacility
    ? await Promise.all([
        getBookings(selectedFacility.id),
        getBookingRequests(selectedFacility.id),
        getVentures(selectedFacility.id),
        getExpenses(selectedFacility.id),
        getYearlyExpenses(selectedFacility.id, new Date().getFullYear()),
      ])
    : [[], [], [], [],0];

  const bookingIds = new Set(bookings.map((b) => b.id));
  const checkOuts = allCheckOuts.filter((c) => bookingIds.has(c.booking));

  const ventureIds = new Set(houseVentures.map((v) => v.id));
  const houseTaskIds = new Set(
    ventureTasks.filter((t) => ventureIds.has(t.venture)).map((t) => t.id)
  );
  const updates = selectedFacility
    ? allUpdates.filter(
        (u) =>
          String(u.house) === String(selectedFacility.id) ||
          (u.venture !== null && ventureIds.has(u.venture)) ||
          (u.task !== null && houseTaskIds.has(u.task))
      )
    : [];

  return (
    <FacilityProvider facilities={facilities} selectedFacility={selectedFacility} yearlyExpenses={yearlyExpenses??0}>
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
          <UpdateDataProvider updates={updates}>
            <VersoShell>{children}</VersoShell>
          </UpdateDataProvider>
        </VentureDataProvider>
      </BookingDataProvider>
    </FacilityProvider>
  );
}
