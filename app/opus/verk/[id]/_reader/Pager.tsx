"use client"

import { useState } from "react"
import { TextField } from "../../../forms/Fields/Fields"

/** Sidnavigering: första/föregående/nästa/sista och hopp till en viss sida. */
export default function Pager({
	page,
	totalPages,
	offset,
	rowCount,
	totalRows,
	busy,
	onGo,
}: {
	page: number
	totalPages: number
	offset: number
	rowCount: number
	totalRows: number
	busy: boolean
	onGo: (page: number) => void
}) {
	const [draft, setDraft] = useState(String(page))
	// A new page replaces whatever was typed.
	const [draftPage, setDraftPage] = useState(page)
	if (draftPage !== page) {
		setDraftPage(page)
		setDraft(String(page))
	}
	const button =
		'rounded border border-border px-3 py-1.5 text-sm text-text hover:border-text/40 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer'
	return (
		<nav aria-label='Sidor' className='flex flex-wrap items-center justify-center gap-2 py-3 text-sm text-text'>
			{/* På smal skärm bara pilarna, så att hela navigeringen ryms på en rad. */}
			<button type='button' aria-label='Första sidan' className={button} disabled={busy || page <= 1} onClick={() => onGo(1)}>
				«<span className='hidden sm:inline'> Första</span>
			</button>
			<button
				type='button'
				aria-label='Föregående sida'
				className={button}
				disabled={busy || page <= 1}
				onClick={() => onGo(page - 1)}>
				‹<span className='hidden sm:inline'> Föregående</span>
			</button>
			<form
				className='flex items-center gap-2'
				onSubmit={event => {
					event.preventDefault()
					const target = Number.parseInt(draft, 10)
					if (Number.isFinite(target)) onGo(target)
				}}>
				<span className='hidden sm:inline'>Sida</span>
				<TextField
					label='Sidnummer'
					hideLabel
					type='number'
					min={1}
					max={totalPages}
					value={draft}
					onChange={event => setDraft(event.target.value)}
					className='!w-20 !py-1.5 text-center'
				/>
				<span>av {totalPages}</span>
			</form>
			<button
				type='button'
				aria-label='Nästa sida'
				className={button}
				disabled={busy || page >= totalPages}
				onClick={() => onGo(page + 1)}>
				<span className='hidden sm:inline'>Nästa </span>›
			</button>
			<button
				type='button'
				aria-label='Sista sidan'
				className={button}
				disabled={busy || page >= totalPages}
				onClick={() => onGo(totalPages)}>
				<span className='hidden sm:inline'>Sista </span>»
			</button>
			<span className='basis-full text-center text-xs text-text/80'>
				Rad {offset + 1}–{offset + rowCount} av {totalRows}
			</span>
		</nav>
	)
}
