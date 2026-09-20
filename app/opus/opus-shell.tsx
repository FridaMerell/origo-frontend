"use client"
import { usePathname } from "next/navigation"
import { ReactNode, Suspense, useEffect, useState } from "react"
import { Splash } from "../components/ui/Splash"
import { NavProgressBar } from "../lib/nav-progress"
import TopBar from "../apsis/top-bar"
import { APP_LINKS, appHref } from "../lib/tenant-links"
import { ORIGO_VERSION } from "../lib/config"

const STORAGE_KEY = "opus-mode"

const OpusShell = ({ children }: { children: ReactNode }) => {
	const [mode, setMode] = useState<"light" | "dark" | null>(null)
	const pathname = usePathname()
	const isLoginRoute = pathname === "/login"

	useEffect(() => {
		const stored = localStorage.getItem(STORAGE_KEY)
		setMode(stored === "dark" || stored === "light" ? stored : "light")
	}, [])

	const toggleMode = () => {
		setMode(previous => {
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
	return <div
		data-theme='opus'
		data-mode={mode ?? undefined}
		className='flex h-full min-h-screen flex-1 flex-col bg-bg text-text font-body'>
		{children}
		<TopBar mode={mode} onToggleMode={toggleMode} />
     <main className="min-w-0 flex-1">{children}</main>
          <footer className="mt-12 border-t border-border bg-surface text-text-muted">
            <div className="mx-auto flex flex-col items-center justify-between gap-3 px-6 py-5 text-sm sm:flex-row sm:px-12">
              <p className="font-mono">
                Apsis <span className="text-text-faint">·</span> ORIGO {ORIGO_VERSION}
              </p>
              <nav aria-label="Systerplatser" className="flex items-center gap-4">
                {APP_LINKS.filter((site) => site.id !== "apsis").map((site) => (
                  <a
                    key={site.id}
                    href={appHref(site.id) ?? "#"}
                    className="no-underline hover:text-accent hover:underline"
                  >
                    {site.name}
                  </a>
                ))}
              </nav>
            </div>
          </footer>
	</div>
}
export default OpusShell