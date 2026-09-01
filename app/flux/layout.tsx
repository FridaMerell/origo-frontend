import type { ReactNode } from "react";
import { Suspense } from "react";
import { FluxProviders } from "@/app/lib/flux-providers";
import { TaskPanelProvider } from "@/app/lib/task-panel-context";
import { NavProgressBar } from "@/app/lib/nav-progress";
import { Splash } from "@/app/components/ui/Splash";
import FluxShell from "./flux-shell";

export const metadata = {
  title: "Flux | Origo",
  description: "Origo",
};

export default function FluxLayout({ children }: { children: ReactNode }) {
  return (
    <div data-theme="flux" className="flex flex-1 flex-col bg-bg font-body text-text">
      <NavProgressBar />
      <Suspense fallback={<Splash tenant="flux" />}>
        <FluxProviders>
          <TaskPanelProvider>
            <FluxShell>{children}</FluxShell>
          </TaskPanelProvider>
        </FluxProviders>
      </Suspense>
    </div>
  );
}
