"use client"

import { PushControls } from "@/app/components/ui/PushControls"
import { useUser } from "@/app/lib/user-context"
import type { SkyEvent } from "./sky/events"
import type { Shower } from "./sky/meteors"

const DATE_FORMAT = new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short" })
const CLOCK_FORMAT = new Intl.DateTimeFormat("sv-SE", { hour: "2-digit", minute: "2-digit" })

const CHOICE =
	"cursor-pointer text-left text-text underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"

// Hur många meteorer i timmen man kan se, eller varför man inte ser några.
function showerNote(shower: Shower) {
	if (shower.hourly >= 1) return `Omkring ${Math.round(shower.hourly)} i timmen härifrån`
	if (shower.at[1] <= 0) return "Radianten är under horisonten"
	if (shower.hourly === 0) return "För ljust för meteorer"
	return "Enstaka meteorer"
}

/**
 * Det som är särskilt på himlen: det som gäller vid kartans tid och det som kommer. En händelse
 * som väljs vrider kartan dit. Fälls ut nere till höger, ovanför tidsraden, och ligger kvar i
 * DOM:en medan den tonar ut.
 */
export default function EventsPanel({
	open,
	today,
	showers,
	coming,
	onChoose,
	onClose,
}: {
	open: boolean
	// Händelserna samma dag som kartans tid, och meteorregnen som pågår.
	today: SkyEvent[]
	showers: Shower[]
	// De närmaste händelserna efter den dagen.
	coming: SkyEvent[]
	onChoose: (time: number) => void
	onClose: () => void
}) {
	const user = useUser()
	const row = (event: SkyEvent, when: string) => (
		<div key={`${event.time}:${event.title}`} className='col-span-2 grid grid-cols-subgrid py-0.5'>
			<dt className='italic text-text-muted'>{when}</dt>
			<dd>
				<button type='button' onClick={() => onChoose(event.time)} className={CHOICE}>
					{event.title}
				</button>
				{event.detail && <span className='block text-text-muted'>{event.detail}</span>}
			</dd>
		</div>
	)

	return (
		<section
			id='caelus-events'
			aria-label='Händelser på himlen'
			inert={!open}
			className={`absolute bottom-0 right-0 max-h-[calc(100%-3.5rem)] w-full max-w-sm overflow-y-auto bg-bg/90 [scrollbar-color:var(--text)_transparent] [scrollbar-width:thin] px-4 pb-3 pt-4 transition-[opacity,translate] duration-300 motion-reduce:transition-none sm:px-5 ${
				open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
			}`}>
			<div className='flex items-baseline justify-between gap-4'>
				<h2 className='font-display text-xl italic text-text'>Händelser</h2>
				<button
					type='button'
					onClick={onClose}
					className='cursor-pointer text-sm text-text-muted underline underline-offset-4 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring'>
					Stäng
				</button>
			</div>
			{(today.length > 0 || showers.length > 0) && (
				<>
					<h3 className='mt-3 text-xs uppercase tracking-[0.16em] text-text-muted'>Den här dagen</h3>
					<dl className='mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 text-sm'>
						{today.map(event => row(event, CLOCK_FORMAT.format(event.time)))}
						{showers.map(shower => (
							<div key={shower.name} className='col-span-2 grid grid-cols-subgrid py-0.5'>
								<dt className='italic text-text-muted'>Pågår</dt>
								<dd className='text-text'>
									{shower.name}
									<span className='block text-text-muted'>{showerNote(shower)}</span>
								</dd>
							</div>
						))}
					</dl>
				</>
			)}
			<h3 className='mt-3 text-xs uppercase tracking-[0.16em] text-text-muted'>Kommande</h3>
			<dl className='mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 text-sm'>
				{coming.map(event => row(event, DATE_FORMAT.format(event.time)))}
			</dl>
			{/* Varningarna för det som kommer når hit som pushnotiser. */}
			{user && (
				<div className='mt-4 flex flex-wrap gap-x-4 gap-y-1 empty:hidden'>
					<PushControls
						item='cursor-pointer text-sm text-text-muted underline underline-offset-4 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-default'
						note='text-sm italic text-text-muted'
					/>
				</div>
			)}
		</section>
	)
}
