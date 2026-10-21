import type { ReactNode } from "react";
import { Suspense } from "react";
import TempusShell from "./tempus-shell";
import { MODE_KEYS } from "@/app/components/ui/mode-keys";
import { readStoredMode } from "@/app/lib/color-mode";
import { TENANT_FONTS } from "@/app/lib/tenant-fonts";
import { TempusProviders } from "./_state/tempus-providers";
import { NavProgressBar } from "@/app/lib/nav-progress";
import { Splash } from "@/app/components/ui/Splash";

export const metadata = {
  title: "Tempus | Origo",
  description: "Säsongsöversikt och ruttplanering för naturintresserade.",
};

export default async function TempusLayout({ children }: { children: ReactNode }) {
  const initialMode = await readStoredMode(MODE_KEYS.tempus);
  return (
    <div
      data-theme="tempus"
      data-mode={initialMode ?? undefined}
      className={`${TENANT_FONTS.tempus} flex flex-1 flex-col bg-bg font-body text-text`}
    >
      <NavProgressBar />
      <Suspense fallback={<Splash tenant="tempus" />}>
        <TempusProviders>
          <TempusShell initialMode={initialMode}>{children}</TempusShell>
        </TempusProviders>
      </Suspense>
    </div>
  );
}
