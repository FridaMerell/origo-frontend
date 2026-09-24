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
		href: '/fortsatt',
		label:'Fortsätt'
	}
]

export default function ({ mode, onToggleMode }: TopBarProps) {
	const pathname = usePathname()

	const navLink =
		"rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-foreground/5"
	const navLinkActive = "bg-foreground/8 font-medium text-foreground"

	return (
		<div
			className={
				" sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-sm"
			}>
			<header className={"container flex items-center gap-5 py-3"}>
				<div className={"pe-5"}>
					<Logo mode={mode} />
				</div>
				<span className='hidden h-7 w-px bg-border sm:block' />
				<nav className={"gap-1 pl-5 hidden items-center md:flex"}>
					{TABS.map((tab, i) => (
						<Link
						key={i}
							href={tab.href}
							className={`${navLink} ${pathname == tab.href ? navLinkActive : ""}`}>
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
						className='grid size-8 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground'>
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
