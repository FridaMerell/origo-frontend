"use client"

import { MODE_KEY, useDarkMode } from "./CaelusTheme"
import { useStored } from "./use-stored"

// Sparas i webbläsaren och läses av kartan, som lyfter fram solen, månen och planeterna
// respektive var norrsken kan synas.
export const PLANET_FOCUS_KEY = "caelus-planet-focus"
export const AURORA_FOCUS_KEY = "caelus-aurora-focus"
// Molnen enligt prognosen visas tills de slås av.
export const CLOUDS_KEY = "caelus-clouds"
// Likaså meteorregnen.
export const METEORS_KEY = "caelus-meteors"

// Ett val som är av tills det slås på, eller på tills det slås av.
function useToggle(key: string, onByDefault: boolean) {
	const [stored, store] = useStored(key)
	const on = onByDefault ? stored !== "off" : stored === "on"
	return [on, () => store(on ? "off" : "on")] as const
}

/**
 * Vad kartan visar: planetfokus, norrsken, moln och meteorregn, slagna av och på. Menyns egen
 * lista, med menyns rader; `item` är radernas klasser.
 */
export default function LayerMenu({ item }: { item: string }) {
	// Mörkt läge följer systemet tills det väljs; valet sparas som ljust eller mörkt.
	const dark = useDarkMode()
	const [, storeMode] = useStored(MODE_KEY)
	const toggles = [
		{ label: "Planetfokus", toggle: useToggle(PLANET_FOCUS_KEY, false) },
		{ label: "Norrsken", toggle: useToggle(AURORA_FOCUS_KEY, false) },
		{ label: "Moln", toggle: useToggle(CLOUDS_KEY, true) },
		{ label: "Meteorregn", toggle: useToggle(METEORS_KEY, true) },
		{ label: "Mörkt läge", toggle: [dark, () => storeMode(dark ? "light" : "dark")] as const },
	]

	return toggles.map(({ label, toggle: [on, flip] }) => (
		<button
			key={label}
			type='button'
			aria-pressed={on}
			onClick={flip}
			className={`${item} flex cursor-pointer items-baseline justify-between gap-4`}>
			{label}
			<span className='text-sm uppercase tracking-[0.16em]'>{on ? "På" : "Av"}</span>
		</button>
	))
}
