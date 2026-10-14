"use client"

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react"

const MINUTE = 60_000
const HOUR = 60 * MINUTE
// Linjalens skala: en timme är 72 px bred, med ett streck var tionde minut.
const PIXELS_PER_MINUTE = 1.2
const TICK_MINUTES = 10
// Hur långt åt vardera hållet strecken ritas; det som hamnar utanför linjalen tonas bort.
const REACH_MINUTES = 8 * 60

const DAY_FORMAT = new Intl.DateTimeFormat("sv-SE", { weekday: "long", day: "numeric", month: "long" })
const YEAR_FORMAT = new Intl.DateTimeFormat("sv-SE", { year: "numeric" })
const CLOCK_FORMAT = new Intl.DateTimeFormat("sv-SE", { hour: "2-digit", minute: "2-digit" })

const LINK =
	"cursor-pointer whitespace-nowrap uppercase tracking-[0.16em] transition-colors duration-200 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring motion-reduce:transition-none"

// Raden under kartan: tiden först, sedan det som skickas in. Bryts på smala skärmar.
const ROW = "flex min-h-8 flex-wrap items-baseline justify-center gap-x-4 gap-y-1 px-4 py-1"

// En tid i det format <input type="datetime-local"> vill ha, i webbläsarens tidszon.
function pickerValue(time: Date) {
	const local = new Date(time.getTime() - time.getTimezoneOffset() * MINUTE)
	return local.toISOString().slice(0, 16)
}

// Strecken kring en tidpunkt: var de hamnar räknat från linjalens mitt, och timmen där en börjar.
function ticksAround(time: Date) {
	const step = TICK_MINUTES * MINUTE
	const first = Math.ceil((time.getTime() - REACH_MINUTES * MINUTE) / step) * step
	const ticks = []
	for (let at = first; at <= time.getTime() + REACH_MINUTES * MINUTE; at += step) {
		const moment = new Date(at)
		const minutes = moment.getMinutes()
		ticks.push({
			at,
			x: ((at - time.getTime()) / MINUTE) * PIXELS_PER_MINUTE,
			length: minutes === 0 ? 14 : minutes === 30 ? 9 : 5,
			hour: minutes === 0 ? String(moment.getHours()).padStart(2, "0") : null,
		})
	}
	return ticks
}

/**
 * Tiden kartan visar. I vila är den bara en rad med datum och klockslag; ett klick på raden
 * tar fram linjalen över kartans nederkant, och ett klick utanför eller Escape lägger undan den.
 * Linjalen dras i sidled för att vrida fram och tillbaka på klockan, som skalan på ett
 * instrument; dygnen stegas med länkarna, "Kalender" öppnar webbläsarens egen kalender och "Nu"
 * går tillbaka till att följa klockan. `live` är sant när kartan följer den. `onScrub` talar om
 * när man drar, så att himlen kan följa handen utan fördröjning. `children` står på samma rad
 * som tiden, efter den.
 */
export default function TimeControls({
	time,
	live,
	onChange,
	onScrub,
	children,
}: {
	time: Date | null
	live: boolean
	onChange: (time: Date | null) => void
	onScrub: (active: boolean) => void
	children?: ReactNode
}) {
	const rootRef = useRef<HTMLDivElement>(null)
	const toggleRef = useRef<HTMLButtonElement>(null)
	const sliderRef = useRef<HTMLDivElement>(null)
	const pickerRef = useRef<HTMLInputElement>(null)
	const dragRef = useRef<{ x: number; time: number } | null>(null)
	const [open, setOpen] = useState(false)

	useEffect(() => {
		if (!open) return
		sliderRef.current?.focus()
		const onKeyDown = (event: globalThis.KeyboardEvent) => {
			if (event.key !== "Escape") return
			setOpen(false)
			toggleRef.current?.focus()
		}
		const onPointerDown = (event: globalThis.PointerEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
		}
		document.addEventListener("keydown", onKeyDown)
		document.addEventListener("pointerdown", onPointerDown)
		return () => {
			document.removeEventListener("keydown", onKeyDown)
			document.removeEventListener("pointerdown", onPointerDown)
		}
	}, [open])

	if (!time) return <div className={`${ROW} text-text-muted`}>{children}</div>

	const shift = (milliseconds: number) => onChange(new Date(time.getTime() + milliseconds))

	const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
		event.currentTarget.setPointerCapture(event.pointerId)
		dragRef.current = { x: event.clientX, time: time.getTime() }
		onScrub(true)
	}
	const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
		const drag = dragRef.current
		if (!drag) return
		// Linjalen följer handen: dras den åt höger kommer tidigare tider in under visaren.
		const minutes = Math.round((drag.x - event.clientX) / PIXELS_PER_MINUTE)
		onChange(new Date(drag.time + minutes * MINUTE))
	}
	const onPointerEnd = () => {
		if (!dragRef.current) return
		dragRef.current = null
		onScrub(false)
	}
	const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		const steps: Record<string, number> = {
			ArrowLeft: -TICK_MINUTES * MINUTE,
			ArrowRight: TICK_MINUTES * MINUTE,
			PageDown: -HOUR,
			PageUp: HOUR,
		}
		const step = steps[event.key]
		if (!step) return
		event.preventDefault()
		shift(step)
	}

	const year = YEAR_FORMAT.format(time)
	return (
		<div ref={rootRef} className='relative text-text-muted'>
			{/* Linjalen ligger över kartans nederkant när den är framme, så kartan behåller sin storlek. */}
			<div
				id='caelus-time-ruler'
				inert={!open}
				className={`absolute inset-x-0 bottom-full flex flex-col items-center bg-bg/90 px-4 pt-3 transition-[opacity,translate] duration-300 motion-reduce:transition-none ${
					open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
				}`}>
			{/* Dygnen stegas i linjalens ändar, timmarna genom att dra i den. */}
			<div className='flex w-full max-w-2xl items-start gap-3 text-xs sm:gap-5'>
				<button type='button' onClick={() => shift(-24 * HOUR)} className={LINK}>
					‹ Dygn
				</button>
			<div
				ref={sliderRef}
				role='slider'
				tabIndex={0}
				aria-label='Klockslag'
				aria-valuetext={CLOCK_FORMAT.format(time)}
				aria-valuenow={time.getHours() * 60 + time.getMinutes()}
				aria-valuemin={0}
				aria-valuemax={24 * 60 - 1}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerEnd}
				onPointerCancel={onPointerEnd}
				onKeyDown={onKeyDown}
				className='min-w-0 flex-1 cursor-grab touch-none select-none text-text mask-[linear-gradient(90deg,transparent,black_18%,black_82%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring active:cursor-grabbing'>
				<svg aria-hidden className='block h-12 w-full overflow-hidden'>
					<line x1='0' x2='100%' y1='8.5' y2='8.5' stroke='currentColor' strokeWidth='1' />
					{/* Inre svg med x=50%: allt nedan räknas från linjalens mitt. */}
					<svg x='50%' overflow='visible'>
						{ticksAround(time).map(tick => (
							<g key={tick.at}>
								<line
									x1={tick.x}
									x2={tick.x}
									y1='8.5'
									y2={8.5 + tick.length}
									stroke='currentColor'
									strokeWidth='1'
								/>
								{tick.hour && (
									<text
										x={tick.x}
										y='41'
										textAnchor='middle'
										fontSize='16'
										fill='currentColor'
										opacity='0.7'>
										{tick.hour}
									</text>
								)}
							</g>
						))}
						{/* Visaren: tiden som gäller ligger under den. */}
						<path d='M-5 0H5L0 8Z' fill='currentColor' />
					</svg>
				</svg>
			</div>
				<button type='button' onClick={() => shift(24 * HOUR)} className={LINK}>
					Dygn ›
				</button>
			</div>
			<span className='relative pb-1 text-xs'>
				<button
					type='button'
					onClick={() => {
						const picker = pickerRef.current
						if (picker?.showPicker) picker.showPicker()
						else picker?.focus()
					}}
					className={LINK}>
					Kalender
				</button>
				<input
					ref={pickerRef}
					type='datetime-local'
					aria-label='Välj datum och tid'
					tabIndex={-1}
					value={pickerValue(time)}
					onChange={event => {
						const picked = new Date(event.target.value)
						if (!Number.isNaN(picked.getTime())) onChange(picked)
					}}
					className='pointer-events-none absolute bottom-0 left-0 size-px opacity-0'
				/>
			</span>
			</div>

			{/* I vila: bara datum och klockslag. Raden tar fram och lägger undan linjalen. */}
			<div className={ROW}>
				{/* På mobil har datum och klockslag alltid en egen rad, så att raden inte hoppar mellan
				    en och två rader när datumets längd ändras. */}
				<span className='flex min-w-0 items-baseline justify-center gap-x-4 max-sm:basis-full'>
					<button
						ref={toggleRef}
						type='button'
						aria-expanded={open}
						aria-controls='caelus-time-ruler'
						onClick={() => setOpen(previous => !previous)}
						className='min-w-0 cursor-pointer truncate text-md text-text first-letter:uppercase hover:text-text-muted focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring'>
						{DAY_FORMAT.format(time)}
						{year !== YEAR_FORMAT.format(new Date()) && ` ${year}`}
						<span className='text-text-muted'> · </span>
						{CLOCK_FORMAT.format(time)}
					</button>
					{!live && (
						<button
							type='button'
							onClick={() => onChange(null)}
							className={`${LINK} text-xs`}>
							Nu
						</button>
					)}
				</span>
				{children}
			</div>
		</div>
	)
}
