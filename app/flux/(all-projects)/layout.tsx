import type { ReactNode } from "react"
import { AllProjectsTimelineData } from "@/app/flux/timeline/all-projects-timeline-data"
import { TaskPanelProvider } from "@/app/flux/_state/task-panel-context"
import FluxShell from "@/app/flux/flux-shell"
import { TaskPanel } from "@/app/flux/tasks/task-panel"
import { MODE_KEYS } from "@/app/components/ui/mode-keys"
import { readStoredMode } from "@/app/lib/color-mode"

export default async function AllProjectsLayout({ children }: { children: ReactNode }) {
  const initialMode = await readStoredMode(MODE_KEYS.flux)
  return (
    <AllProjectsTimelineData>
      <TaskPanelProvider>
        <FluxShell initialMode={initialMode}>{children}</FluxShell>
        <TaskPanel />
      </TaskPanelProvider>
    </AllProjectsTimelineData>
  )
}
