"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { logout } from "@/app/actions/auth"
import { APP_LINKS, appHref } from "@/app/lib/tenant-links"
import { useUser } from "@/app/lib/user-context"
import EventAlertToggle from "./EventAlertToggle"
import LayerMenu from "./LayerMenu"
import { useStored } from "./use-stored"

// Om händelsepanelen är utfälld; den öppnas från menyn och stängs i panelen.
export const EVENTS_KEY = "caelus-events"

const ITEM =
	"block w-full px-4 py-2 text-left text-lg text-text no-underline hover:bg-text hover:text-bg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring"

export default function CaelusMenu() {
	const user = useUser()
	const [open, setOpen] = useState(false)
	// Vilken undermeny som visas i stället för menyns länkar: vad kartan visar, eller de andra apparna.
	const [submenu, setSubmenu] = useState<"layers" | "apps" | null>(null)
	const [, storeEvents] = useStored(EVENTS_KEY)
	const rootRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!open) return
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setOpen(false)
		}
		const onPointerDown = (event: PointerEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
		}
		document.addEventListener("keydown", onKeyDown)
		document.addEventListener("pointerdown", onPointerDown)
		return () => {
			document.removeEventListener("keydown", onKeyDown)
			document.removeEventListener("pointerdown", onPointerDown)
		}
	}, [open])

	return (
		<div
			ref={rootRef}
			// Den stängda menyn tar plats i lådan men ska inte ta emot klick: kartan under den, med
			// kalenderskivans timring, ska gå att ta i.
			className='pointer-events-none absolute right-2 top-2 z-10 flex flex-col items-end sm:right-3 sm:top-3'>
			<button
				type='button'
				aria-expanded={open}
				aria-controls='caelus-menu'
				aria-label={open ? "Stäng menyn" : "Öppna menyn"}
				onClick={() => {
					// Menyn öppnas alltid med sina länkar.
					setSubmenu(null)
					setOpen(previous => !previous)
				}}
				className='pointer-events-auto flex size-11 cursor-pointer flex-col items-center justify-center gap-1.5 text-text hover:text-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring'>
				{/* Strecken viks ihop till ett kryss när menyn är öppen. */}
				<span
					aria-hidden
					className={`h-px w-6 bg-current transition-transform duration-300 motion-reduce:transition-none ${open ? "translate-y-[7px] rotate-45" : ""}`}
				/>
				<span
					aria-hidden
					className={`h-px w-6 bg-current transition-opacity duration-300 motion-reduce:transition-none ${open ? "opacity-0" : ""}`}
				/>
				<span
					aria-hidden
					className={`h-px w-6 bg-current transition-transform duration-300 motion-reduce:transition-none ${open ? "-translate-y-[7px] -rotate-45" : ""}`}
				/>
			</button>
			{/* Menyn ligger kvar i DOM:en så att den kan tona ut; stängd är den inert. */}
				<nav
					id='caelus-menu'
					aria-label='Meny'
					inert={!open}
					className={`min-w-48 border border-text bg-bg py-1 transition-[opacity,translate] duration-300 motion-reduce:transition-none ${
						open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
					}`}>
					{submenu ? (
					<>
						<button type='button' onClick={() => setSubmenu(null)} className={`${ITEM} cursor-pointer text-text-muted`}>
							‹ Meny
						</button>
						{submenu === "layers" ? (
							<LayerMenu item={ITEM} />
						) : (
							// Undermenyn visas först efter ett klick, så adresserna räknas i webbläsaren.
							APP_LINKS.filter(site => site.id !== "caelus").map(site => (
								<a key={site.id} href={appHref(site.id)} className={ITEM}>
									{site.name}
								</a>
							))
						)}
					</>
				) : (
					<>
					<Link href='/' onClick={() => setOpen(false)} className={ITEM}>
						Stjärnhimlen
					</Link>
					<button type='button' onClick={() => setSubmenu("layers")} className={`${ITEM} cursor-pointer`}>
						Visa ›
					</button>
					{/* Händelsepanelen hör till kartan, så den öppnas där. */}
					<Link
						href='/'
						onClick={() => {
							storeEvents("open")
							setOpen(false)
						}}
						className={ITEM}>
						Händelser
					</Link>
					{user && <EventAlertToggle item={ITEM} />}
					{/* /om är Origos gemensamma sida på alla domäner. */}
					<Link href='/om-caelus' onClick={() => setOpen(false)} className={ITEM}>
						Om
					</Link>
					<button type='button' onClick={() => setSubmenu("apps")} className={`${ITEM} cursor-pointer`}>
						Origo ›
					</button>
					{user ? (
						<button
							type='button'
							onClick={() => void logout().then(() => window.location.reload())}
							className={`${ITEM} cursor-pointer`}>
							Logga ut
						</button>
					) : (
						<Link
							href='/login'
							onClick={() => setOpen(false)}
							className={ITEM}>
							Logga in
						</Link>
					)}
					</>
				)}
				</nav>
		</div>
	)
}
