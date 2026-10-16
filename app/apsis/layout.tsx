import type { ReactNode } from "react";
import { Suspense } from "react";
import { IBM_Plex_Mono, PT_Serif, Source_Serif_4 } from "next/font/google";
import { ApsisProviders } from "./_state/apsis-providers";
import { NavProgressBar } from "@/app/lib/nav-progress";
import { Splash } from "@/app/components/ui/Splash";
import ApsisShell from "./apsis-shell";

// Apsis' typefaces (app/styles/tokens/typography.css). The variables sit on this layout's root
// element, so drawers portaled into the theme scope inherit them too.
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin", "latin-ext"],
  axes: ["opsz"],
  display: "swap",
  preload: false,
});
const ptSerif = PT_Serif({
  variable: "--font-pt-serif",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
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
  title: "Apsis | Origo",
  description: "En bildsamling av kyrkoabsider.",
};

export default function ApsisLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-theme="apsis"
      className={`${sourceSerif.variable} ${ptSerif.variable} ${plexMono.variable} flex flex-1 flex-col bg-bg font-body text-text`}
    >
      <NavProgressBar />
      <Suspense fallback={<Splash tenant="apsis" />}>
        <ApsisProviders>
          <ApsisShell>{children}</ApsisShell>
        </ApsisProviders>
      </Suspense>
    </div>
  );
}
