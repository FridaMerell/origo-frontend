import { useEffect, useRef, useState } from "react"
import { ease } from "./view"

const GLIDE_MILLISECONDS = 700
// Ett stjärndygn: tiden det tar för stjärnhimlen att komma tillbaka till samma läge.
const SIDEREAL_DAY = 86_164_091

/**
 * Tiden som ska ritas, på väg mot `target`, så att himlen glider dit i stället för att hoppa.
 * Stjärnhimlen ser likadan ut efter ett helt stjärndygn, så ett långt hopp glider bara den
 * sista biten: från den stund som ger samma himmel som nyss. Med `direct` följer tiden målet
 * utan övergång, för när den dras för hand.
 */
export function useGlidingTime(target: Date | null, direct = false) {
	const [shown, setShown] = useState<Date | null>(null)
	const shownRef = useRef<number | null>(null)
	const targetTime = target?.getTime() ?? null

	// Medan tiden dras ges målet tillbaka som det är, utan att gå via en effekt: annars blir varje
	// pekarrörelse två uppdateringar i rad, och vid snabba rörelser varnar React för en slinga.
	// När dragningen släpps tar tillståndet över där handen var.
	const [wasDirect, setWasDirect] = useState(direct)
	if (wasDirect !== direct) {
		setWasDirect(direct)
		if (!direct) setShown(target)
	}

	useEffect(() => {
		if (targetTime === null) return
		if (direct) {
			shownRef.current = targetTime
			return
		}
		const arrive = (time: number) => {
			shownRef.current = time
			setShown(new Date(time))
		}
		const from = shownRef.current
		if (from === targetTime) return
		const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches
		// Klockans egna minutsteg, och första bilden, behöver ingen övergång.
		if (from === null || still || Math.abs(targetTime - from) < 90_000) {
			arrive(targetTime)
			return
		}
		const turn =
			((((targetTime - from + SIDEREAL_DAY / 2) % SIDEREAL_DAY) + SIDEREAL_DAY) % SIDEREAL_DAY) - SIDEREAL_DAY / 2
		const start = targetTime - turn
		const began = performance.now()
		let frame = requestAnimationFrame(function glide(time) {
			const progress = ease((time - began) / GLIDE_MILLISECONDS)
			arrive(start + turn * progress)
			if (progress < 1) frame = requestAnimationFrame(glide)
		})
		return () => cancelAnimationFrame(frame)
	}, [targetTime, direct])

	return direct ? target : shown
}
