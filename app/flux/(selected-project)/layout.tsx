import type { ReactNode } from "react"
import { SelectedProjectProvider } from "@/app/flux/_state/selected-project-provider"
import { TaskPanelProvider } from "@/app/lib/task-panel-context"
import FluxShell from "@/app/flux/flux-shell"

export default function SelectedProjectLayout({ children }: { children: ReactNode }) {
  return (
    <SelectedProjectProvider>
      <TaskPanelProvider>
        <FluxShell>{children}</FluxShell>
      </TaskPanelProvider>
    </SelectedProjectProvider>
  )
}
