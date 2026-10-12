import { useMemo, useSyncExternalStore } from "react"

const MINUTE = 60_000

function subscribe(listener: () => void) {
	const timer = setInterval(listener, 5_000)
	return () => clearInterval(timer)
}

/** Klockan, på hel minut. Null under serverrenderingen och den första bilden. */
export function useClock() {
	const minute = useSyncExternalStore(
		subscribe,
		() => Math.floor(Date.now() / MINUTE),
		() => null,
	)
	return useMemo(() => (minute === null ? null : new Date(minute * MINUTE)), [minute])
}
