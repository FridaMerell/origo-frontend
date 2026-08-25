"use client"

import { useEffect, useState, type ReactNode } from "react"
import Toolbar from "./toolbar"

const STORAGE_KEY = "flux-mode"

export default function FluxShell({
  children,
  userName,
}: {
  children: ReactNode
  userName: string
}) {
  const [mode, setMode] = useState<"light" | "dark" | null>(null)

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

  return (
    <div
      data-theme="flux"
      data-mode={mode ?? undefined}
      className="flex h-full min-h-screen flex-1 flex-col bg-bg text-text font-body"
    >
      <div className="flex-1 overflow-auto pb-24 pt-24 sm:pb-14 sm:pt-24">{children}</div>
      <Toolbar mode={mode} onToggleMode={toggleMode} userName={userName} />
    </div>
  )
}
