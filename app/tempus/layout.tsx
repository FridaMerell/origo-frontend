import type { ReactNode } from "react";
import { Suspense } from "react";
import { IBM_Plex_Mono, Karla, Petrona } from "next/font/google";
import TempusShell from "./tempus-shell";
import { TempusProviders } from "./_state/tempus-providers";
import { NavProgressBar } from "@/app/lib/nav-progress";
import { Splash } from "@/app/components/ui/Splash";

// Tempus' typefaces (app/styles/tokens/typography.css). The variables sit on this layout's root
// element, so drawers portaled into the theme scope inherit them too.
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
  title: "Tempus | Origo",
  description: "Säsongsöversikt och ruttplanering för naturintresserade.",
};

export default function TempusLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-theme="tempus"
      className={`${petrona.variable} ${karla.variable} ${plexMono.variable} flex flex-1 flex-col bg-bg font-body text-text`}
    >
      <NavProgressBar />
      <Suspense fallback={<Splash tenant="tempus" />}>
        <TempusProviders>
          <TempusShell>{children}</TempusShell>
        </TempusProviders>
      </Suspense>
    </div>
  );
}
