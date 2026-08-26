import type { ReactNode } from "react";
import { FluxProviders } from "@/app/lib/flux-providers";
import { TaskPanelProvider } from "@/app/lib/task-panel-context";
import FluxShell from "./flux-shell";

export const metadata = {
  title: "Flux | Origo",
  description: "Origo",
};
export default function FluxLayout({ children }: { children: ReactNode }) {
  return (
    <FluxProviders>
      <TaskPanelProvider>
        <FluxShell>{children}</FluxShell>
      </TaskPanelProvider>
    </FluxProviders>
  );
}
