"use client"

import type { Body } from "astronomy-engine"
import { useEffect, useId, useMemo, useRef, useState } from "react"
import type { Scene } from "./sky/types"
import { useDismissableOpen } from "@/app/components/ui/use-dismissable-open"

// Det man kan söka fram: en himlakropp eller en stjärnbild i himlen som visas.
export type Sought = { kind: "body"; body: Body } | { kind: "figure"; id: string }

type Hit = { key: string; target: Sought; name: string; gloss: string; altitude: number }

const MAX_HITS = 8

// Gemener utan accenter, så att "saturn" hittar Saturnus och "orion" Orion oavsett hur det skrivs.
function plain(text: string) {
	return text.toLocaleLowerCase("sv").normalize("NFD").replace(/[̀-ͯ]/g, "")
}

// Om texten, eller något ord i den, börjar med det man skrivit.
function matches(text: string, query: string) {
	const normal = plain(text)
	return normal.startsWith(query) || normal.split(/[\s-]+/).some(word => word.startsWith(query))
}

/**
 * Sökningen efter solen, månen, planeterna och himlens stjärnbilder: en liten knapp under
 * menyknappen, i samma tunna linjer, som fäller ut ett fält med träffar på samma sätt som menyn.
 */
export default function SkySearch({ scene, onChoose }: { scene: Scene | null; onChoose: (target: Sought) => void }) {
	// Som menyn stängs utfällningen med Esc och av ett tryck utanför.
	const { open, setOpen, ref: rootRef } = useDismissableOpen<HTMLDivElement>({ onDismiss: () => close() })
	const [query, setQuery] = useState("")
	const [active, setActive] = useState(0)
	const inputRef = useRef<HTMLInputElement>(null)
	const listId = useId()

	const hits = useMemo((): Hit[] => {
		const wanted = plain(query.trim())
		if (!wanted || !scene) return []
		const bodies = scene.allBodies
			.filter(item => matches(item.name, wanted))
			.map(item => ({
				key: `body:${item.body}`,
				target: { kind: "body", body: item.body } as const,
				name: item.name,
				gloss: "",
				altitude: item.at[1],
			}))
		// Ormen är två figurer med samma id; den står med en gång, så högt som dess högsta del.
		const figures = new Map<string, Hit>()
		for (const figure of scene.figures) {
			if (!matches(figure.name, wanted) && !matches(figure.gloss, wanted)) continue
			const known = figures.get(figure.id)
			if (known) {
				known.altitude = Math.max(known.altitude, figure.at[1])
				continue
			}
			figures.set(figure.id, {
				key: `figure:${figure.id}`,
				target: { kind: "figure", id: figure.id },
				name: figure.name,
				gloss: figure.gloss && figure.gloss !== figure.name ? figure.gloss : "",
				altitude: figure.at[1],
			})
		}
		// Det vars eget namn börjar med det man skrivit först, sedan i bokstavsordning.
		const first = (hit: Hit) => (plain(hit.name).startsWith(wanted) ? 0 : 1)
		return [...bodies, ...figures.values()]
			.sort((a, b) => first(a) - first(b) || a.name.localeCompare(b.name, "sv"))
			.slice(0, MAX_HITS)
	}, [query, scene])

	const close = () => {
		setOpen(false)
		setQuery("")
		setActive(0)
	}

	useEffect(() => {
		if (open) inputRef.current?.focus()
	}, [open])

	const choose = (hit: Hit) => {
		close()
		onChoose(hit.target)
	}

	return (
		<div
			ref={rootRef}
			className='pointer-events-none absolute right-2 top-[3.25rem] flex flex-col items-end sm:right-3 sm:top-14'>
			<button
				type='button'
				aria-expanded={open}
				aria-controls={listId}
				aria-label={open ? "Stäng sökningen" : "Sök planet eller stjärnbild"}
				onClick={() => (open ? close() : setOpen(true))}
				className='pointer-events-auto flex size-11 cursor-pointer items-center justify-center text-text hover:text-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring'>
				<svg aria-hidden viewBox='0 0 24 24' fill='none' stroke='currentColor' className='size-6'>
					<circle cx='10' cy='10' r='6.5' vectorEffect='non-scaling-stroke' />
					<path d='M15 15l6 6' vectorEffect='non-scaling-stroke' />
				</svg>
			</button>
			{/* Utfällningen ser ut som menyn och ligger kvar i DOM:en så att den kan tona ut. */}
			<div
				inert={!open}
				className={`w-72 max-w-[calc(100vw-2rem)] border border-text bg-bg py-1 transition-[opacity,translate] duration-300 motion-reduce:transition-none ${
					open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
				}`}>
				<input
					ref={inputRef}
					type='text'
					role='combobox'
					aria-label='Planet eller stjärnbild'
					aria-expanded={hits.length > 0}
					aria-controls={listId}
					aria-activedescendant={hits[active] ? `${listId}-${active}` : undefined}
					autoComplete='off'
					enterKeyHint='go'
					placeholder='Planet eller stjärnbild'
					value={query}
					onChange={event => {
						setQuery(event.target.value)
						setActive(0)
					}}
					onKeyDown={event => {
						if (event.key === "ArrowDown" && hits.length > 0) {
							event.preventDefault()
							setActive(current => (current + 1) % hits.length)
						} else if (event.key === "ArrowUp" && hits.length > 0) {
							event.preventDefault()
							setActive(current => (current - 1 + hits.length) % hits.length)
						} else if (event.key === "Enter" && hits[active]) {
							event.preventDefault()
							choose(hits[active])
						}
					}}
					className='block w-full bg-transparent px-4 py-2 text-lg text-text placeholder:italic placeholder:text-text-muted focus:outline-none'
				/>
				<ul id={listId} role='listbox' aria-label='Träffar' className='empty:hidden'>
					{hits.map((hit, index) => (
						<li
							key={hit.key}
							id={`${listId}-${index}`}
							role='option'
							aria-selected={index === active}
							onPointerEnter={() => setActive(index)}
							onClick={() => choose(hit)}
							className={`cursor-pointer px-4 py-2 text-lg ${index === active ? "bg-text text-bg" : "text-text"}`}>
							{hit.name}
							{(hit.gloss || hit.altitude <= 0) && (
								<span className={`block text-sm italic ${index === active ? "text-bg" : "text-text-muted"}`}>
									{[hit.gloss, hit.altitude <= 0 ? "under horisonten" : ""].filter(Boolean).join(" · ")}
								</span>
							)}
						</li>
					))}
				</ul>
				{query.trim() && hits.length === 0 && <p className='px-4 py-2 text-sm italic text-text-muted'>Inga träffar.</p>}
			</div>
		</div>
	)
}
