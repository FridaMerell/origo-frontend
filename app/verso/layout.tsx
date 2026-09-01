import type { ReactNode } from "react";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { FACILITY_COOKIE } from "@/app/lib/config";
import { getVersoDashboard } from "@/app/lib/dal";
import { BookingDataProvider } from "@/app/lib/booking-context";
import { FacilityProvider } from "@/app/lib/facility-context";
import { VentureDataProvider } from "@/app/lib/venture-context";
import { UpdateDataProvider } from "@/app/lib/update-context";
import { NavProgressBar } from "@/app/lib/nav-progress";
import { Splash } from "@/app/components/ui/Splash";
import VersoShell from "./verso-shell";

export const metadata = {
  title: "Verso | Origo",
  description: "Verso - Origo",
};

export default function VersoLayout({ children }: { children: ReactNode }) {
  return (
    <div data-theme="verso" className="flex flex-1 flex-col bg-bg font-body text-text">
      <NavProgressBar />
      <Suspense fallback={<Splash tenant="verso" />}>
        <VersoData>{children}</VersoData>
      </Suspense>
    </div>
  );
}

async function VersoData({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const selectedId = cookieStore.get(FACILITY_COOKIE)?.value;
  const dashboard = await getVersoDashboard(selectedId, new Date().getFullYear());

  const facilities = dashboard?.houses ?? [];
  const selectedFacility = dashboard?.house ?? null;
  const bookings = dashboard?.bookings ?? [];
  const bookingRequests = dashboard?.booking_requests ?? [];
  const checkOuts = dashboard?.check_outs ?? [];
  const houseVentures = dashboard?.ventures ?? [];
  const ventureTasks = dashboard?.venture_tasks ?? [];
  const houseExpenses = dashboard?.expenses ?? [];
  const updates = dashboard?.updates ?? [];
  const yearlyExpenses = dashboard?.yearly_expense_total ?? 0;

  return (
    <FacilityProvider
      facilities={facilities}
      selectedFacility={selectedFacility}
      yearlyExpenses={yearlyExpenses}
    >
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
