"use client"

import { useId, useState, type KeyboardEvent, type MouseEvent } from "react"

/** Om en lista på `space` px ryms under fältet, inom närmaste rullande förälder eller fönstret; annars om det finns mer plats där än ovanför. */
function hasRoomBelow(field: HTMLElement | null, space: number) {
	if (!field) return true
	const rect = field.getBoundingClientRect()
	let top = 0
	let bottom = window.innerHeight
	for (let parent = field.parentElement; parent; parent = parent.parentElement) {
		if (/auto|scroll|hidden/.test(getComputedStyle(parent).overflowY)) {
			const box = parent.getBoundingClientRect()
			top = Math.max(top, box.top)
			bottom = Math.min(bottom, box.bottom)
			break
		}
	}
	const below = bottom - rect.bottom
	return below >= space || below >= rect.top - top
}

/**
 * Beteendet hos en sökbar rullgardin: ett textfält med en lista att välja ur. Stilfri; den som
 * använder den ritar fältet och listan och sprider ut `inputProps`, `listProps` och `optionProps`.
 *
 * - Listan öppnas när fältet får fokus eller klickas, och stängs när det lämnas eller med Escape.
 * - Med `matches` visar listan alla förslag när den öppnas och snävas in först när man skriver;
 *   utan `matches` är förslagen redan svaret på det skrivna (en sökning) och visas som de är.
 * - Piltangenterna flyttar markeringen, Enter väljer.
 * - `above` säger att listan ska ritas över fältet, när den inte ryms under.
 */
export function useCombobox<Option>({
	options: allOptions,
	query,
	matches,
	isCurrent,
	onPick,
	listSpace = 200,
}: {
	options: Option[]
	/** Det som står i fältet. */
	query: string
	/** Om ett förslag passar det skrivna. Utelämnas när förslagen redan är filtrerade. */
	matches?: (option: Option, query: string) => boolean
	/** Om ett förslag är fältets nuvarande värde; det markeras när listan öppnas. */
	isCurrent?: (option: Option) => boolean
	onPick: (option: Option) => void
	/** Höjden en öppen lista tar, för att avgöra om den ryms under fältet. */
	listSpace?: number
}) {
	const id = useId()
	// Elementet runt fältet och listan, för att mäta om listan ryms under.
	const [wrapper, setWrapper] = useState<HTMLElement | null>(null)
	const [open, setOpen] = useState(false)
	// Sant från att man skrivit något tills listan stängs; ett redan ifyllt värde filtrerar inte.
	const [typing, setTyping] = useState(false)
	const [active, setActive] = useState(-1)
	const [above, setAbove] = useState(false)

	const options = matches && typing && query.trim() ? allOptions.filter(option => matches(option, query)) : allOptions
	const shown = open && options.length > 0
	const optionId = (index: number) => `${id}-${index}`

	function openList() {
		if (open) return
		setAbove(!hasRoomBelow(wrapper, listSpace))
		setOpen(true)
		setTyping(false)
		setActive(isCurrent ? allOptions.findIndex(isCurrent) : -1)
	}

	function closeList() {
		setOpen(false)
		setTyping(false)
		setActive(-1)
	}

	/** Anropas när texten i fältet ändras. */
	function typed() {
		if (!open) setAbove(!hasRoomBelow(wrapper, listSpace))
		setOpen(true)
		setTyping(true)
		setActive(-1)
	}

	function pick(option: Option) {
		onPick(option)
		closeList()
	}

	function move(step: number) {
		const next = (active + step + options.length) % options.length
		setActive(next)
		document.getElementById(optionId(next))?.scrollIntoView({ block: "nearest" })
	}

	function onKeyDown(event: KeyboardEvent) {
		if (!shown) {
			if (event.key === "ArrowDown" || event.key === "ArrowUp") {
				event.preventDefault()
				openList()
			}
			return
		}
		if (event.key === "ArrowDown") {
			event.preventDefault()
			move(1)
		} else if (event.key === "ArrowUp") {
			event.preventDefault()
			move(active < 0 ? 0 : -1)
		} else if (event.key === "Enter" && active >= 0) {
			event.preventDefault()
			pick(options[active])
		} else if (event.key === "Escape") {
			// Stänger bara listan, inte en dialog eller panel runt fältet.
			event.stopPropagation()
			closeList()
		}
	}

	return {
		/** Sätts som `ref` på elementet som omger fältet och listan. */
		setWrapper,
		/** Förslagen som ska ritas. */
		options,
		/** Om listan ska ritas. */
		shown,
		above,
		/** Index för det markerade förslaget, eller -1. */
		active,
		typed,
		inputProps: {
			role: "combobox" as const,
			autoComplete: "off",
			"aria-expanded": shown,
			"aria-controls": id,
			"aria-autocomplete": "list" as const,
			"aria-activedescendant": shown && active >= 0 ? optionId(active) : undefined,
			onFocus: openList,
			onClick: openList,
			onBlur: closeList,
			onKeyDown,
		},
		listProps: {
			id,
			role: "listbox" as const,
			// Ett tryck i listan, också på dess rullningslist, ska inte ta fokus från fältet och stänga den.
			onMouseDown: (event: MouseEvent) => event.preventDefault(),
		},
		optionProps: (index: number) => ({
			id: optionId(index),
			role: "option" as const,
			tabIndex: -1,
			"aria-selected": isCurrent ? isCurrent(options[index]) : index === active,
			onClick: () => pick(options[index]),
			onMouseEnter: () => setActive(index),
		}),
	}
}
