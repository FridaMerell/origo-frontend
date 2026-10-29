"use client"
import { usePathname } from "next/navigation"
import { ReactNode } from "react"
import TopBar from "./TopBar"
import { APP_LINKS } from "../lib/tenant-links"
import { ORIGO_VERSION } from "../lib/config"
import { ThemeScope } from "../components/ui/ThemeScope"
import { useAppHrefs } from "../components/ui/use-app-hrefs"
import { useStoredMode, type ColorMode } from "../components/ui/use-stored-mode"
import { MODE_KEYS } from "../components/ui/mode-keys"

const OpusShell = ({ initialMode, children }: { initialMode: ColorMode | null; children: ReactNode }) => {
	const [mode, setMode] = useStoredMode(MODE_KEYS.opus, "light", initialMode)
	const pathname = usePathname()
	const isLoginRoute = pathname === "/login"
	const siteHrefs = useAppHrefs()

	const toggleMode = () => {
		setMode(mode === "dark" ? "light" : "dark")
	}
	if (isLoginRoute) {
		return (
			<ThemeScope
				theme='opus'
				mode={mode ?? "light"}
				className='flex min-h-screen flex-1 flex-col bg-bg font-body text-text'>
				{children}
			</ThemeScope>
		)
	}

	return (
		<ThemeScope
			theme='opus'
			mode={mode ?? "light"}
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
						{APP_LINKS.filter(site => site.id !== "opus").map(site => (
							<a
								key={site.id}
								href={siteHrefs[site.id] ?? "#"}
								className='no-underline hover:text-accent hover:underline'>
								{site.name}
							</a>
						))}
						<a
							href={siteHrefs.origo ? `${siteHrefs.origo}integritet` : "#"}
							className='no-underline hover:text-accent hover:underline'>
							Integritet
						</a>
					</nav>
				</div>
			</footer>
		</ThemeScope>
	)
}
export default OpusShell
