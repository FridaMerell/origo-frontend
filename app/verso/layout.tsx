import type { ReactNode } from "react";
import { Suspense } from "react";
import { IBM_Plex_Mono, Karla, Petrona } from "next/font/google";
import { cookies } from "next/headers";
import { FACILITY_COOKIE, VERSO_MODE_COOKIE } from "@/app/lib/config";
import { getVersoDashboard } from "@/app/lib/dal/verso";
import { VersoDataProvider } from "@/app/verso/_state/verso-context";
import { NavProgressBar } from "@/app/lib/nav-progress";
import { Splash } from "@/app/components/ui/Splash";
import VersoShell, { type VersoMode } from "./verso-shell";

// Verso's typefaces (app/styles/tokens/typography.css). The variables sit on this layout's root
// element, which wraps the ThemeScope, so drawers portaled into the scope inherit them too.
const petrona = Petrona({
  variable: "--font-petrona",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
});
const karla = Karla({
  variable: "--font-karla",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
});
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  display: "swap",
  preload: false,
});

export const metadata = {
  title: "Verso | Origo",
  description: "Verso - Origo",
};

export default async function VersoLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const mode: VersoMode = cookieStore.get(VERSO_MODE_COOKIE)?.value === "dark" ? "dark" : "light";

  return (
    <div
      data-theme="verso"
      data-mode={mode}
      className={`${petrona.variable} ${karla.variable} ${plexMono.variable} flex flex-1 flex-col bg-bg font-body text-text`}
    >
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
      <VersoShell initialMode={mode}>{children}</VersoShell>
    </VersoDataProvider>
  );
}
