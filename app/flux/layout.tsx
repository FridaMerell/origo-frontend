import type { ReactNode } from "react";
import { Suspense } from "react";
import { NavProgressBar } from "@/app/lib/nav-progress";
import { Splash } from "@/app/components/ui/Splash";
import { ThemeScope } from "@/app/components/ui/ThemeScope";
import { MODE_KEYS } from "@/app/components/ui/mode-keys";
import { readStoredMode } from "@/app/lib/color-mode";

export const metadata = {
  title: "Flux | Origo",
  description: "Origo",
};

export default async function FluxLayout({ children }: { children: ReactNode }) {
  const initialMode = await readStoredMode(MODE_KEYS.flux);
  return (
    <ThemeScope theme="flux" mode={initialMode ?? "light"} className="flex flex-1 flex-col bg-bg font-body text-text">
      <NavProgressBar />
      <Suspense fallback={<Splash tenant="flux" />}>
        {children}
      </Suspense>
    </ThemeScope>
  );
}
