import type { ReactNode } from "react"
import { AllProjectsTimelineData } from "@/app/flux/timeline/all-projects-timeline-data"
import { TaskPanelProvider } from "@/app/lib/task-panel-context"
import FluxShell from "@/app/flux/flux-shell"
import { TaskPanel } from "@/app/flux/tasks/task-panel"

export default function AllProjectsLayout({ children }: { children: ReactNode }) {
  return (
    <AllProjectsTimelineData>
      <TaskPanelProvider>
        <FluxShell>{children}</FluxShell>
        <TaskPanel />
      </TaskPanelProvider>
    </AllProjectsTimelineData>
  )
}
