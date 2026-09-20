import type { ReactNode } from "react";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { FACILITY_COOKIE, VERSO_MODE_COOKIE } from "@/app/lib/config";
import { getVersoDashboard } from "@/app/lib/dal";
import { VersoDataProvider } from "@/app/verso/_state/verso-context";
import { BookingDrawerProvider } from "@/app/verso/_state/booking-drawer";
import { NavProgressBar } from "@/app/lib/nav-progress";
import { Splash } from "@/app/components/ui/Splash";
import VersoShell, { type VersoMode } from "./verso-shell";

export const metadata = {
  title: "Verso | Origo",
  description: "Verso - Origo",
};

export default async function VersoLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const mode: VersoMode = cookieStore.get(VERSO_MODE_COOKIE)?.value === "dark" ? "dark" : "light";

  return (
    <div data-theme="verso" data-mode={mode} className="flex flex-1 flex-col bg-bg font-body text-text">
      <NavProgressBar />
      <Suspense fallback={<Splash tenant="verso" />}>
        <VersoData mode={mode}>{children}</VersoData>
      </Suspense>
    </div>
  );
}

async function VersoData({ children, mode }: { children: ReactNode; mode: VersoMode }) {
  const cookieStore = await cookies();
  const selectedId = cookieStore.get(FACILITY_COOKIE)?.value;
  const dashboard = await getVersoDashboard(selectedId, new Date().getFullYear());

  return (
    <VersoDataProvider
      facilities={dashboard?.houses ?? []}
      selectedFacility={dashboard?.house ?? null}
      yearlyExpenses={dashboard?.yearly_expense_total ?? 0}
      bookings={dashboard?.bookings ?? []}
      ventures={dashboard?.ventures ?? []}
      ventureTasks={dashboard?.venture_tasks ?? []}
      expenses={dashboard?.expenses ?? []}
      updates={dashboard?.updates ?? []}
    >
      <BookingDrawerProvider>
        <VersoShell initialMode={mode}>{children}</VersoShell>
      </BookingDrawerProvider>
    </VersoDataProvider>
  );
}
