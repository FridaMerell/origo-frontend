"use client"

import { useEffect, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import Nav from "./nav"
import { APP_LINKS, appHref } from "@/app/lib/tenant-links"

const STORAGE_KEY = "tempus-mode"

export default function TempusShell({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"light" | "dark" | null>(null)
  const [siteHrefs, setSiteHrefs] = useState<Record<string, string>>({})
  const pathname = usePathname()
  const isLoginRoute = pathname === "/login"

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    setMode(stored === "dark" || stored === "light" ? stored : null)
    setSiteHrefs(
      Object.fromEntries(APP_LINKS.map((app) => [app.id, appHref(app.id)])),
    )
  }, [])

  const toggleMode = () => {
    setMode((previous) => {
      const next = previous
        ? previous === "dark"
          ? "light"
          : "dark"
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "light"
          : "dark"
      localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }

  if (isLoginRoute) {
    return (
      <div
        data-theme="tempus"
        data-mode={mode ?? undefined}
        className="flex min-h-screen flex-1 flex-col bg-bg font-body text-text"
      >
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    )
  }

  return (
    <div
      data-theme="tempus"
      data-mode={mode ?? undefined}
      className="flex min-h-screen flex-1 flex-col bg-bg font-body text-text"
    >
      <header className="bg-bg">
        <Nav mode={mode} onToggleMode={toggleMode} />
      </header>
      <main className="min-w-0 flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:pb-0">{children}</main>
      <footer className="mt-15 border-t border-border bg-surface text-text-muted">
        <div className="container mx-auto flex flex-col items-center justify-between gap-3 py-6 text-sm max-sm:px-4 sm:flex-row">
          <p className="font-mono">
            Tempus <span className="text-text-faint">·</span> ORIGO {process.env.NEXT_PUBLIC_ORIGO_VERSION}
          </p>
          <nav aria-label="Systerplatser" className="flex items-center gap-4">
            {APP_LINKS.filter((site) => site.id !== "tempus").map((site) => (
              <a
                key={site.id}
                href={siteHrefs[site.id] ?? "#"}
                className="no-underline hover:text-accent hover:underline"
              >
                {site.name}
              </a>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  )
}
