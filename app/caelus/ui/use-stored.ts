import { useSyncExternalStore } from "react"

const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
	listeners.add(listener)
	window.addEventListener("storage", listener)
	return () => {
		listeners.delete(listener)
		window.removeEventListener("storage", listener)
	}
}

function read(key: string) {
	try {
		return localStorage.getItem(key)
	} catch {
		// Webbläsare som nekar lagring: valet gäller då bara tills sidan laddas om.
		return null
	}
}

/**
 * Ett värde i webbläsarens localStorage, som text. Under serverrenderingen och den första
 * bilden är det null, så att sidan ser likadan ut som den servern skickade.
 */
export function useStored(key: string): [string | null, (value: string) => void] {
	const value = useSyncExternalStore(
		subscribe,
		() => read(key),
		() => null,
	)
	const store = (next: string) => {
		try {
			localStorage.setItem(key, next)
		} catch {}
		for (const listener of listeners) listener()
	}
	return [value, store]
}
