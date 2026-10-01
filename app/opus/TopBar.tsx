import Image from "next/image"
import icon from "./icon.png"
import logoLight from "./light.png"
import Link from "next/link"
import { usePathname } from "next/navigation"
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
			<span className={"hidden font-display font-bold text-xl sm:inline"}>Opus</span>
		</Link>
	)
}

const TABS = [
	{
		href: "/bokmarken",
		label: "Bokmärken",
	},
	{
		href: '/fortsatt',
		label:'Fortsätt'
	}
]

export default function ({ mode, onToggleMode }: TopBarProps) {
	const pathname = usePathname()

	const navLink =
		"rounded-md px-2.5 py-1.5 transition-colors hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
	// Färgen väljs per läge; båda klasserna samtidigt avgörs av CSS-ordningen, inte klassordningen.
	const navLinkIdle = "text-text-muted hover:text-text"
	const navLinkActive = "bg-foreground/8 font-medium text-text"

	return (
		<div
			className={
				" sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-sm"
			}>
			<header className={"container flex items-center gap-3 py-3 sm:gap-5"}>
				<div className={"shrink-0 sm:pe-5"}>
					<Logo mode={mode} />
				</div>
				<span className='hidden h-7 w-px bg-border sm:block' />
				<nav className={"flex items-center gap-1 sm:pl-5"}>
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
				<nav className={'ml-auto'} aria-label={"Konto och kontroller"}>
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
				</nav>
			</header>
		</div>
	)
}
