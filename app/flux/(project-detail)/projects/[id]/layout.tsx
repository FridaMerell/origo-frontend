import type { ReactNode } from "react"
import { SelectedProjectProvider } from "@/app/flux/_state/selected-project-provider"
import { TaskPanelProvider } from "@/app/flux/_state/task-panel-context"
import FluxShell from "@/app/flux/flux-shell"
import { MODE_KEYS } from "@/app/components/ui/mode-keys"
import { readStoredMode } from "@/app/lib/color-mode"

export default async function ProjectDetailLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params
  const initialMode = await readStoredMode(MODE_KEYS.flux)
  return (
    <SelectedProjectProvider projectId={id}>
      <TaskPanelProvider>
        <FluxShell initialMode={initialMode}>{children}</FluxShell>
      </TaskPanelProvider>
    </SelectedProjectProvider>
  )
}
