"use client"

import { useSyncExternalStore, type ReactNode } from "react"
import { ThemeScope } from "@/app/components/ui/ThemeScope"
import { useStored } from "./use-stored"

// Ljust eller mörkt läge, valt i menyn: "light" eller "dark". Utan val följer temat systemet.
export const MODE_KEY = "caelus-mode"

const DARK_QUERY = "(prefers-color-scheme: dark)"

function subscribe(listener: () => void) {
	const query = window.matchMedia(DARK_QUERY)
	query.addEventListener("change", listener)
	return () => query.removeEventListener("change", listener)
}

/** Om läget är mörkt: det valda, annars systemets. Under serverrenderingen ljust. */
export function useDarkMode() {
	const [stored] = useStored(MODE_KEY)
	const system = useSyncExternalStore(
		subscribe,
		() => window.matchMedia(DARK_QUERY).matches,
		() => false,
	)
	return stored === "dark" || (stored !== "light" && system)
}

/** Caelus tema, i det läge som valts i menyn. */
export default function CaelusTheme({ className, children }: { className: string; children: ReactNode }) {
	const [stored] = useStored(MODE_KEY)
	const mode = stored === "dark" || stored === "light" ? stored : undefined
	return (
		<ThemeScope theme='caelus' mode={mode} className={className}>
			{children}
		</ThemeScope>
	)
}
