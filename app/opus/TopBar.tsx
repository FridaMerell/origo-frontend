import Image from "next/image"
import icon from "./icon.png"
import logoLight from "./light.png"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { XIcon } from "lucide-react"
type TopBarProps = {
	mode: "light" | "dark"
	onToggleMode: () => void
}

function Logo({ mode }: { mode: "light" | "dark" }) {
	return (
		<Link href={"/"} className={"flex gap-1 items-center"}>
			<Image
				width={70}
				height={80}
				src={mode == "dark" ? logoLight.src : logoLight.src}
				alt='Till startsidan'
			/>
			<span className={"font-display font-bold text-xl"}>Opus</span>
		</Link>
	)
}

const TABS = [
	{
		href: "/bokmarken",
		label: "Bokmärken",
	},
	{
		href: "/anteckningar",
		label: "Anteckningar",
	},
	{
		href: "/ordlistor",
		label: "Ordlistor",
	},
	{
		href: '/fortsatt',
		label:'Fortsätt'
	}
]
export default function ({ mode, onToggleMode }: TopBarProps) {
	const pathname = usePathname()
	// Mobil: flikarna ryms inte i fältet och ligger i en sidopanel från höger.
	const [menuOpen, setMenuOpen] = useState(false)
	const closeRef = useRef<HTMLButtonElement>(null)

	useEffect(() => setMenuOpen(false), [pathname])

	useEffect(() => {
		if (!menuOpen) return
		closeRef.current?.focus()
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") setMenuOpen(false)
		}
		document.addEventListener("keydown", onKey)
		return () => document.removeEventListener("keydown", onKey)
	}, [menuOpen])

	const navLink =
		"rounded-md px-2.5 py-1.5 transition-colors hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
	// Färgen väljs per läge; båda klasserna samtidigt avgörs av CSS-ordningen, inte klassordningen.
	const navLinkIdle = "text-text-muted hover:text-text"
	const navLinkActive = "bg-foreground/8 font-medium text-text"

	return (
		<>
		<div
			className={
				" sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-sm"
			}>
			<header className={"container flex items-center gap-3 py-3 sm:gap-5"}>
				<div className={"shrink-0 sm:pe-5"}>
					<Logo mode={mode} />
				</div>
				<span className='hidden h-7 w-px bg-border sm:block' />
				<nav className={"hidden items-center gap-1 sm:flex sm:pl-5"}>
					{TABS.map((tab, i) => (
						<Link
						key={i}
							href={tab.href}
							aria-current={pathname == tab.href ? "page" : undefined}
							className={`${navLink} ${pathname == tab.href ? navLinkActive : navLinkIdle}`}>
							{tab.label}
						</Link>
					))}
				</nav>
				<nav className={'ml-auto flex items-center gap-2'} aria-label={"Konto och kontroller"}>
					<button
						type='button'
						onClick={onToggleMode}
						aria-label={
							mode == "dark" ? "Byt till ljust läge" : "Byt till mörkt läge"
						}
						title={mode == "dark" ? "Ljust läge" : "Mörkt läge"}
						className='grid size-8 place-items-center rounded-md border border-border text-text-muted transition-colors hover:bg-foreground/5 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring'>
						{mode === "dark" ? (
							<svg
								viewBox='0 0 24 24'
								className='size-4'
								fill='none'
								stroke='currentColor'
								strokeWidth='1.6'
								strokeLinecap='round'>
								<circle cx='12' cy='12' r='4' />
								<path d='M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4' />
							</svg>
						) : (
							<svg
								viewBox='0 0 24 24'
								className='size-4'
								fill='none'
								stroke='currentColor'
								strokeWidth='1.6'
								strokeLinejoin='round'>
								<path d='M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z' />
							</svg>
						)}
					</button>
					<button
						type='button'
						onClick={() => setMenuOpen(true)}
						aria-expanded={menuOpen}
						aria-haspopup='dialog'
						aria-label='Öppna menyn'
						className='grid size-8 place-items-center rounded-md border border-border text-text-muted transition-colors hover:bg-foreground/5 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:hidden cursor-pointer'>
						<svg viewBox='0 0 24 24' className='size-4' fill='none' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round'>
							<path d='M4 9h16M4 15h16' />
						</svg>
					</button>
				</nav>
			</header>
		</div>
		{/*
		 * Mobil: en sidopanel som glider in från höger över en tonad sida; en rad per sida, så den
		 * växer med fler sidor (och scrollar). Den ligger kvar i DOM:en så att den kan glida ut igen,
		 * men är inert och klickgenomsläpplig när den är stängd.
		 */}
		<div
			className='fixed z-50 sm:hidden'
			style={{ inset: 0, pointerEvents: menuOpen ? "auto" : "none" }}
			inert={!menuOpen}>
			<div
				aria-hidden
				className='absolute'
				style={{
					inset: 0,
					background: "rgb(0 0 0 / 0.45)",
					opacity: menuOpen ? 1 : 0,
					transition: "opacity 300ms ease",
				}}
				onPointerDown={() => setMenuOpen(false)}
			/>
			<div
				id='opus-mobile-menu'
				role='dialog'
				aria-modal='true'
				aria-label='Meny'
				className='absolute flex flex-col bg-surface shadow-lg'
				style={{
					top: 0,
					right: 0,
					bottom: 0,
					width: "min(20rem, 82vw)",
					transform: menuOpen ? "translateX(0)" : "translateX(100%)",
					transition: "transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1)",
				}}>
				<div className='flex items-center justify-between border-b border-border px-5 py-4'>
					<span className='font-display text-xl font-bold text-text'>Opus</span>
					<button
						ref={closeRef}
						type='button'
						onClick={() => setMenuOpen(false)}
						aria-label='Stäng menyn'
						className='grid size-8 place-items-center rounded-md text-text-muted transition-colors hover:bg-foreground/5 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring cursor-pointer'>
						<XIcon size={16} aria-hidden />
					</button>
				</div>
				<nav aria-label='Opus' className='flex-1 overflow-y-auto px-3 py-3'>
					<ul className='flex flex-col'>
						{TABS.map(tab => {
							const active = pathname == tab.href
							return (
								<li key={tab.href} className='border-b border-border last:border-b-0'>
									<Link
										href={tab.href}
										aria-current={active ? "page" : undefined}
										onClick={() => setMenuOpen(false)}
										className={`my-1 block rounded-md px-3 py-2.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${
											active ? "bg-foreground/8 font-medium text-text" : "text-text-muted hover:bg-foreground/5 hover:text-text"
										}`}>
										{/* Anfang: första bokstaven stor och röd, som rubrikerna i läsvyn. */}
										<span className='block font-display text-xl first-letter:mr-0.5 first-letter:text-3xl first-letter:font-bold first-letter:leading-none first-letter:text-primary'>
											{tab.label}
										</span>
									</Link>
								</li>
							)
						})}
					</ul>
				</nav>
			</div>
		</div>
		</>
	)
}
