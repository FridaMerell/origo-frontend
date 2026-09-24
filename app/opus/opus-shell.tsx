"use client"
import { usePathname } from "next/navigation"
import { ReactNode, useEffect, useState } from "react"
import TopBar from "./TopBar"
import { APP_LINKS, appHref } from "../lib/tenant-links"
import { ORIGO_VERSION } from "../lib/config"

const STORAGE_KEY = "opus-mode"

const OpusShell = ({ children }: { children: ReactNode }) => {
	const [mode, setMode] = useState<"light" | "dark" | null>(null)
	const pathname = usePathname()
	const isLoginRoute = pathname === "/login"
	const [siteHrefs, setSiteHrefs] = useState<Record<string, string>>({})

	useEffect(() => {
		const stored = localStorage.getItem(STORAGE_KEY)
		setMode(stored === "dark" || stored === "light" ? stored : "light")
		setSiteHrefs(
			Object.fromEntries(APP_LINKS.map(app => [app.id, appHref(app.id)])),
		)
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
	if (isLoginRoute) {
		return (
			<div
				data-theme='opus'
				data-mode={mode ?? "light"}
				className='flex min-h-screen flex-1 flex-col bg-bg font-body text-text'>
				{children}
			</div>
		)
	}

	return (
		<div
			data-theme='opus'
			data-mode={mode ?? "light"}
			className='flex grain h-full min-h-screen flex-1 flex-col bg-bg text-text font-body'>
			<TopBar mode={mode ?? 'light'} onToggleMode={toggleMode} />
			<main className='container py-10 flex-1'>{children}</main>
			<footer className='mt-12 border-t border-border bg-surface text-text-muted'>
				<div className='container flex flex-col items-center justify-between gap-3 px-6 py-5 text-sm sm:flex-row sm:px-12'>
					<p className='font-mono'>
						Opus <span className='text-text-faint'>·</span> ORIGO{" "}
						{ORIGO_VERSION}
					</p>
					<nav aria-label='Systerplatser' className='flex items-center gap-4'>
						{APP_LINKS.filter(site => site.id !== "tempus").map(site => (
							<a
								key={site.id}
								href={siteHrefs[site.id] ?? "#"}
								className='no-underline hover:text-accent hover:underline'>
								{site.name}
							</a>
						))}
					</nav>
				</div>
			</footer>
		</div>
	)
}
export default OpusShell
