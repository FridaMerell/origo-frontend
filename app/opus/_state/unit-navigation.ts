"use client"

import { useEffect, useEffectEvent } from "react"
import type { Id } from "@/app/lib/dal/opus"

/**
 * Liten händelsebrygga mellan kapitelindexet (Indexes, i sidhuvudet) och rutnätet
 * (ParallelReader) — de är syskon i page.tsx, inte förälder/barn, så ett klick i indexet
 * meddelar rutnätet via ett DOM-event i stället för att lyfta delad state mellan dem.
 */
const EVENT_NAME = "opus:navigate-to-unit"

export function requestUnitNavigation(unitId: Id) {
	window.dispatchEvent(new CustomEvent<Id>(EVENT_NAME, { detail: unitId }))
}

export function useUnitNavigationListener(onNavigate: (unitId: Id) => void) {
	const navigate = useEffectEvent(onNavigate)
	useEffect(() => {
		const listener = (event: Event) => navigate((event as CustomEvent<Id>).detail)
		window.addEventListener(EVENT_NAME, listener)
		return () => window.removeEventListener(EVENT_NAME, listener)
	}, [])
}
