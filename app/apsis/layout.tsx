import type { ReactNode } from "react";
import { Suspense } from "react";
import { ApsisProviders } from "./_state/apsis-providers";
import { NavProgressBar } from "@/app/lib/nav-progress";
import { Splash } from "@/app/components/ui/Splash";
import ApsisShell from "./apsis-shell";
import { MODE_KEYS } from "@/app/components/ui/mode-keys";
import { readStoredMode } from "@/app/lib/color-mode";
import { TENANT_FONTS } from "@/app/lib/tenant-fonts";

export const metadata = {
  title: "Apsis | Origo",
  description: "En bildsamling av kyrkoabsider.",
};

export default async function ApsisLayout({ children }: { children: ReactNode }) {
  const initialMode = await readStoredMode(MODE_KEYS.apsis);
  return (
    <div
      data-theme="apsis"
      data-mode={initialMode ?? undefined}
      className={`${TENANT_FONTS.apsis} flex flex-1 flex-col bg-bg font-body text-text`}
    >
      <NavProgressBar />
      <Suspense fallback={<Splash tenant="apsis" />}>
        <ApsisProviders>
          <ApsisShell initialMode={initialMode}>{children}</ApsisShell>
        </ApsisProviders>
      </Suspense>
    </div>
  );
}
