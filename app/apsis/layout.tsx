import type { ReactNode } from "react";
import { Suspense } from "react";
import { ApsisProviders } from "@/app/lib/apsis-providers";
import { NavProgressBar } from "@/app/lib/nav-progress";
import { Splash } from "@/app/components/ui/Splash";
import ApsisShell from "./apsis-shell";

export const metadata = {
  title: "Apsis | Origo",
  description: "En bildsamling av kyrkoabsider.",
};

export default function ApsisLayout({ children }: { children: ReactNode }) {
  return (
    <div data-theme="apsis" className="flex flex-1 flex-col bg-bg font-body text-text">
      <NavProgressBar />
      <Suspense fallback={<Splash tenant="apsis" />}>
        <ApsisProviders>
          <ApsisShell>{children}</ApsisShell>
        </ApsisProviders>
      </Suspense>
    </div>
  );
}
