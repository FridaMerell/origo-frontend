import type { ReactNode } from "react"
import { SelectedProjectProvider } from "@/app/flux/_state/selected-project-provider"
import { TaskPanelProvider } from "@/app/flux/_state/task-panel-context"
import FluxShell from "@/app/flux/flux-shell"
import { MODE_KEYS } from "@/app/components/ui/mode-keys"
import { readStoredMode } from "@/app/lib/color-mode"

export default async function SelectedProjectLayout({ children }: { children: ReactNode }) {
  const initialMode = await readStoredMode(MODE_KEYS.flux)
  return (
    <SelectedProjectProvider>
      <TaskPanelProvider>
        <FluxShell initialMode={initialMode}>{children}</FluxShell>
      </TaskPanelProvider>
    </SelectedProjectProvider>
  )
}
