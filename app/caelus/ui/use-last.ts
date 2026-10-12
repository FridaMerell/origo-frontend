import { useState } from "react"

/**
 * Det senaste värdet som inte var null. Används för innehåll som ska stå kvar medan det tonar
 * ut, så att texten inte försvinner i samma ögonblick som den slutar gälla.
 */
export function useLast<T>(value: T | null) {
	const [last, setLast] = useState(value)
	if (value !== null && value !== last) setLast(value)
	return value ?? last
}
