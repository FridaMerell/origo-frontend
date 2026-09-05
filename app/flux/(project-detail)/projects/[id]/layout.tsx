import type { ReactNode } from "react"
import { SelectedProjectProvider } from "@/app/flux/_state/selected-project-provider"
import { TaskPanelProvider } from "@/app/lib/task-panel-context"
import FluxShell from "@/app/flux/flux-shell"

export default async function ProjectDetailLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <SelectedProjectProvider projectId={id}>
      <TaskPanelProvider>
        <FluxShell>{children}</FluxShell>
      </TaskPanelProvider>
    </SelectedProjectProvider>
  )
}
