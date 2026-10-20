"use client"

import { type ReactNode } from "react"
import { usePathname } from "next/navigation"
import Toolbar from "./toolbar"
import { TaskPanel } from "./tasks/task-panel"
import { ThemeScope } from "@/app/components/ui/ThemeScope"
import { useStoredMode } from "@/app/components/ui/use-stored-mode"

const STORAGE_KEY = "flux-mode"

export default function FluxShell({
  children,
}: {
  children: ReactNode
}) {
  const [mode, setMode] = useStoredMode(STORAGE_KEY, "light")
  const pathname = usePathname()
  const isLoginRoute = pathname === "/login"
  const isTimelineRoute = pathname === "/timeline"

  const toggleMode = () => {
    setMode(mode === "dark" ? "light" : "dark")
  }

  if (isLoginRoute) {
    return (
      <ThemeScope theme="flux" mode={mode ?? undefined} className="flex h-full min-h-screen flex-1 flex-col bg-bg text-text font-body">
        {children}
      </ThemeScope>
    )
  }

  return (
    <ThemeScope
      theme="flux"
      mode={mode ?? undefined}
      className="flex h-full min-h-screen flex-1 flex-col bg-bg text-text font-body"
    >
      <div className="flex-1 overflow-visible pb-24 pt-4 sm:pb-14 sm:pt-24 md:mt-5">
        <div className="container">{children}</div>
      </div>
      <Toolbar mode={mode} onToggleMode={toggleMode} />
      {!isTimelineRoute && <TaskPanel />}
    </ThemeScope>
  )
}
