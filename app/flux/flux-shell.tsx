"use client"

import { useEffect, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import Toolbar from "./toolbar"
import { TaskPanel } from "./tasks/task-panel"
import { ThemeScope } from "@/app/components/ui/ThemeScope"

const STORAGE_KEY = "flux-mode"

export default function FluxShell({
  children,
}: {
  children: ReactNode
}) {
  const [mode, setMode] = useState<"light" | "dark" | null>(null)
  const pathname = usePathname()
  const isLoginRoute = pathname === "/login"
  const isTimelineRoute = pathname === "/timeline"

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    setMode(stored === "dark" || stored === "light" ? stored : "light")
  }, [])

  const toggleMode = () => {
    setMode((prev) => {
      const next = prev === "dark" ? "light" : "dark"
      localStorage.setItem(STORAGE_KEY, next)
      return next
    })
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
