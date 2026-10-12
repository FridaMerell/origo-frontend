"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { logout } from "@/app/actions/auth"
import { useUser } from "@/app/lib/user-context"
import { useStored } from "./use-stored"

// Sparas i webbläsaren och läses av kartan, som lyfter fram solen, månen och planeterna
// respektive var norrsken kan synas.
export const PLANET_FOCUS_KEY = "caelus-planet-focus"
export const AURORA_FOCUS_KEY = "caelus-aurora-focus"

const ITEM =
	"block w-full px-4 py-2 text-left text-lg text-text no-underline hover:bg-text hover:text-bg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring"

export default function CaelusMenu() {
	const user = useUser()
	const [open, setOpen] = useState(false)
	const [storedFocus, storeFocus] = useStored(PLANET_FOCUS_KEY)
	const planetFocus = storedFocus === "on"
	const [storedAurora, storeAurora] = useStored(AURORA_FOCUS_KEY)
	const auroraFocus = storedAurora === "on"
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
				onClick={() => setOpen(previous => !previous)}
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
					<Link href='/' onClick={() => setOpen(false)} className={ITEM}>
						Stjärnhimlen
					</Link>
					<button
						type='button'
						aria-pressed={planetFocus}
						onClick={() => storeFocus(planetFocus ? "off" : "on")}
						className={`${ITEM} flex cursor-pointer items-baseline justify-between gap-4`}>
						Planetfokus
						<span className='text-sm uppercase tracking-[0.16em]'>{planetFocus ? "På" : "Av"}</span>
					</button>
					<button
						type='button'
						aria-pressed={auroraFocus}
						onClick={() => storeAurora(auroraFocus ? "off" : "on")}
						className={`${ITEM} flex cursor-pointer items-baseline justify-between gap-4`}>
						Norrsken
						<span className='text-sm uppercase tracking-[0.16em]'>{auroraFocus ? "På" : "Av"}</span>
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
				</nav>
		</div>
	)
}
