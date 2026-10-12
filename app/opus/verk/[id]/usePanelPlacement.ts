import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from "react"

/** Det en panel placeras vid: ett element i texten, eller något annat som kan säga var det är. */
export type Anchor = { getBoundingClientRect(): DOMRect }

/** `maxHeight` sätts bara när panelen måste kortas för att inte täcka ordet (smala fönster). */
export type Placement = { top: number; left: number; maxHeight?: number }

const MARGIN = 12
const GAP = 8

/** Panelens höjd utan någon kortning: rubrik, fält och knappar var för sig, eftersom fälten rullar när den är kortad. */
function naturalHeight(panel: HTMLElement) {
	const parts = [...(panel.firstElementChild?.children ?? [])] as HTMLElement[]
	const height = parts.reduce((sum, part) => sum + Math.max(part.scrollHeight, part.offsetHeight), 2)
	return Math.min(height, window.innerHeight * 0.85)
}

/**
 * Var panelen ska ligga för att aldrig täcka det den gäller: under ordet om den ryms, annars över,
 * annars bredvid. I ett smalt fönster där inget av det går hamnar den på den sida som har mest plats
 * och kortas till den.
 */
function placeBeside(word: DOMRect, panel: HTMLElement, reserveHeight: number): Placement {
	const width = panel.offsetWidth
	// Platsen väljs för panelen som högst, så att den står still när innehållet blir högre eller lägre.
	const height = Math.min(Math.max(naturalHeight(panel), reserveHeight), window.innerHeight * 0.85)
	const spaceBelow = window.innerHeight - word.bottom - GAP - MARGIN
	const spaceAbove = word.top - GAP - MARGIN
	const centre = word.left + word.width / 2
	const centred = Math.min(Math.max(MARGIN, centre - width / 2), window.innerWidth - width - MARGIN)

	if (height <= spaceBelow) return { top: word.bottom + GAP, left: centred }
	if (height <= spaceAbove) return { top: word.top - height - GAP, left: centred }

	const fitsRight = word.right + MARGIN + width <= window.innerWidth - MARGIN
	const fitsLeft = word.left - MARGIN - width >= MARGIN
	if (fitsRight || fitsLeft) {
		return {
			top: Math.min(Math.max(MARGIN, word.top - MARGIN), window.innerHeight - height - MARGIN),
			left: fitsRight ? word.right + MARGIN : word.left - MARGIN - width,
		}
	}
	return spaceBelow >= spaceAbove
		? { top: word.bottom + GAP, left: centred, maxHeight: spaceBelow }
		: { top: MARGIN, left: centred, maxHeight: spaceAbove }
}

/**
 * Håller en flytande panel på plats vid `anchor`: när sidan rullas, fönstret ändras eller panelen
 * själv ändrar storlek. Null tills panelen har mätts första gången.
 *
 * `reserveHeight` är panelens största höjd. Platsen väljs efter den, så att panelens övre vänstra
 * hörn står still när innehållet byts mot något lägre eller högre.
 */
export function usePanelPlacement(anchor: Anchor, panelRef: RefObject<HTMLElement | null>, reserveHeight = 0) {
	const [placement, setPlacement] = useState<Placement | null>(null)

	const place = useCallback(() => {
		const panel = panelRef.current
		const word = anchor.getBoundingClientRect()
		// Ett element som tagits bort ur sidan ger en tom ruta i 0,0; behåll då platsen panelen har.
		if (!panel || (word.width === 0 && word.height === 0)) return
		const next = placeBeside(word, panel, reserveHeight)
		setPlacement(current =>
			current && current.top === next.top && current.left === next.left && current.maxHeight === next.maxHeight
				? current
				: next,
		)
	}, [anchor, panelRef, reserveHeight])

	useLayoutEffect(place, [place])

	useEffect(() => {
		const panel = panelRef.current
		if (!panel) return
		const onScroll = (event: Event) => {
			// Rullning inne i panelen själv flyttar inte ordet.
			if (event.target instanceof Node && panel.contains(event.target)) return
			place()
		}
		const observer = new ResizeObserver(place)
		observer.observe(panel)
		window.addEventListener("scroll", onScroll, true)
		window.addEventListener("resize", place)
		return () => {
			observer.disconnect()
			window.removeEventListener("scroll", onScroll, true)
			window.removeEventListener("resize", place)
		}
	}, [place, panelRef])

	return placement
}
