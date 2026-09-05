import type { ReactNode } from "react";
import { Suspense } from "react";
import { NavProgressBar } from "@/app/lib/nav-progress";
import { Splash } from "@/app/components/ui/Splash";

export const metadata = {
  title: "Flux | Origo",
  description: "Origo",
};

export default function FluxLayout({ children }: { children: ReactNode }) {
  return (
    <div data-theme="flux" className="flex flex-1 flex-col bg-bg font-body text-text">
      <NavProgressBar />
      <Suspense fallback={<Splash tenant="flux" />}>
        {children}
      </Suspense>
    </div>
  );
}
