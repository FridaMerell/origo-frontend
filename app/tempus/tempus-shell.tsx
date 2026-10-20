"use client"

import { type ReactNode } from "react"
import { flushSync } from "react-dom"
import { usePathname } from "next/navigation"
import Nav from "./nav"
import { APP_LINKS } from "@/app/lib/tenant-links"
import { ThemeScope } from "@/app/components/ui/ThemeScope"
import { useAppHrefs } from "@/app/components/ui/use-app-hrefs"
import { useStoredMode } from "@/app/components/ui/use-stored-mode"

const STORAGE_KEY = "tempus-mode"

export default function TempusShell({ children }: { children: ReactNode }) {
  const [mode, setMode] = useStoredMode(STORAGE_KEY)
  const siteHrefs = useAppHrefs()
  const pathname = usePathname()
  const isLoginRoute = pathname === "/login"

  const toggleMode = () => {
    const apply = () =>
      setMode(
        mode
          ? mode === "dark"
            ? "light"
            : "dark"
          : window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "light"
            : "dark",
      )
    // The browser cross-fades the two modes; where it cannot, or with reduced
    // motion, the mode switches at once as before.
    if (document.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.startViewTransition(() => flushSync(apply))
    } else {
      apply()
    }
  }

  if (isLoginRoute) {
    return (
      <ThemeScope
        theme="tempus"
        mode={mode ?? undefined}
        className="flex min-h-screen flex-1 flex-col bg-bg font-body text-text"
      >
        <main className="min-w-0 flex-1">{children}</main>
      </ThemeScope>
    )
  }

  return (
    <ThemeScope
      theme="tempus"
      mode={mode ?? undefined}
      className="flex min-h-screen flex-1 flex-col bg-bg font-body text-text"
    >
      <header className="bg-bg">
        <Nav mode={mode} onToggleMode={toggleMode} />
      </header>
      <main className="min-w-0 flex-1  sm:pb-0">{children}</main>
      <footer className="mt-15 border-t border-border bg-surface pb-[calc(4.5rem+env(safe-area-inset-bottom))] text-text-muted sm:pb-0">
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
            <a
              href="/integritet"
              className="no-underline hover:text-accent hover:underline"
            >
              Integritet
            </a>
          </nav>
        </div>
      </footer>
    </ThemeScope>
  )
}
