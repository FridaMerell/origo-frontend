"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

export type MenuItem =
	| "separator"
	| {
			label: string
			onSelect: () => void
			disabled?: boolean
			/** Förklarar varför valet är avstängt eller vad det gör. */
			hint?: string
			danger?: boolean
	  }

/**
 * Liten textmeny (en knapp som öppnar en lista med tydligt namngivna val), i stället för rader
 * av ikonknappar. Stängs med Escape, klick utanför eller när ett val görs.
 */
export default function Menu({
	trigger,
	ariaLabel,
	items,
	align = "right",
	triggerClassName = "",
	disabled = false,
}: {
	trigger: ReactNode
	ariaLabel: string
	items: MenuItem[]
	align?: "left" | "right"
	triggerClassName?: string
	disabled?: boolean
}) {
	const [open, setOpen] = useState(false)
	const ref = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!open) return
		const onDown = (event: MouseEvent) => {
			if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
		}
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") setOpen(false)
		}
		document.addEventListener("mousedown", onDown)
		document.addEventListener("keydown", onKey)
		return () => {
			document.removeEventListener("mousedown", onDown)
			document.removeEventListener("keydown", onKey)
		}
	}, [open])

	return (
		<div ref={ref} className='relative inline-block'>
			<button
				type='button'
				aria-haspopup='menu'
				aria-expanded={open}
				aria-label={ariaLabel}
				disabled={disabled}
				onClick={() => setOpen(current => !current)}
				className={triggerClassName}>
				{trigger}
			</button>
			{open && (
				<div
					role='menu'
					className={`absolute z-[35] mt-1 w-64 max-w-[80vw] rounded-md border border-border bg-surface py-1 text-text shadow-lg ${
						align === "right" ? "right-0" : "left-0"
					}`}>
					{items.map((item, index) =>
						item === "separator" ? (
							<hr key={index} className='my-1 border-border' />
						) : (
							<button
								key={index}
								type='button'
								role='menuitem'
								disabled={item.disabled}
								title={item.hint}
								onClick={() => {
									setOpen(false)
									item.onSelect()
								}}
								className={`block w-full px-3 py-2 text-left text-sm hover:bg-text/10 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer ${
									item.danger ? "text-primary" : "text-text"
								}`}>
								{item.label}
							</button>
						),
					)}
				</div>
			)}
		</div>
	)
}
