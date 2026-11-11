"use client"

import type { ReactNode } from "react"
import { direction } from "./sky-info"
import type { Tonight } from "./sky/tonight"

const DAY_FORMAT = new Intl.DateTimeFormat("sv-SE", { weekday: "long", day: "numeric", month: "long" })
const CLOCK_FORMAT = new Intl.DateTimeFormat("sv-SE", { hour: "2-digit", minute: "2-digit" })

// En tid som vrider kartan dit. Strecket syns hela tiden, så att det går att se på en telefon
// att tiden går att välja.
const CHOICE =
	"-my-2 inline-block cursor-pointer py-2 text-text underline decoration-text/60 underline-offset-4 hover:decoration-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"

function clock(time: number) {
	return CLOCK_FORMAT.format(time)
}

function auroraNote(aurora: NonNullable<Tonight["aurora"]>) {
	if (aurora.bearing === null) return "Syns inte härifrån"
	if (aurora.upper >= 90) return "Kan synas över hela himlen"
	if (aurora.upper < 20) return `Kan synas lågt i ${direction(aurora.bearing)}`
	return `Kan synas i ${direction(aurora.bearing)}, upp till ${Math.round(aurora.upper)}°`
}

/**
 * Natten kring kartans tid: när den är bäst och vad som syns då. Fälls ut nere till höger, på
 * händelsepanelens plats, och ligger kvar i DOM:en medan den tonar ut. En tid som väljs vrider
 * kartan dit.
 */
export default function TonightPanel({
	open,
	tonight,
	hasForecast,
	onChoose,
	onClose,
}: {
	open: boolean
	tonight: Tonight | null
	// Om SMHI har någon molnprognos alls för platsen.
	hasForecast: boolean
	onChoose: (time: number) => void
	onClose: () => void
}) {
	const at = (time: number, label = clock(time)) => (
		<button type='button' onClick={() => onChoose(time)} className={CHOICE}>
			{label}
		</button>
	)
	const row = (term: string, value: ReactNode, more?: ReactNode) => (
		<div key={term} className='col-span-2 grid grid-cols-subgrid py-0.5'>
			<dt className='italic text-text-muted'>{term}</dt>
			<dd className='text-text'>
				{value}
				{more && <span className='block text-text-muted'>{more}</span>}
			</dd>
		</div>
	)

	let content: ReactNode = null
	if (tonight) {
		const { start, end, dark, best, clouds, moon, planets, showers, aurora } = tonight
		// Natten heter efter kvällen den hör till, även när den börjar efter midnatt.
		const day = DAY_FORMAT.format(start - 12 * 60 * 60_000)
		const moonTimes = [
			moon.rise !== null && { time: moon.rise, word: "Går upp" },
			moon.set !== null && { time: moon.set, word: "Går ner" },
		]
			.filter((item): item is { time: number; word: string } => Boolean(item))
			.sort((a, b) => a.time - b.time)
		content = (
			<>
				<p className='text-sm text-text-muted'>
					{day.charAt(0).toUpperCase()}
					{day.slice(1)}
					{dark ? `, natt ${clock(start)}–${clock(end)}` : ", solen går aldrig under −6°"}
				</p>
				<dl className='mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 text-sm'>
					{best.from === start && best.to === end
						? row("Bäst", `${best.verdict} hela natten`)
						: row("Bäst", at(best.from, `${clock(best.from)}–${clock(best.to)}`), best.verdict)}
					{clouds
						? row(
								"Moln",
								clouds.changes === null ? (
									clouds.first
								) : (
									<>
										{clouds.first}, {clouds.last.toLowerCase()} från {at(clouds.changes)}
									</>
								),
							)
						: row("Moln", hasForecast ? "Ingen prognos för natten" : "Ingen molnprognos för platsen")}
					{row(
						"Månen",
						`${moon.phase}, ${Math.round(moon.lit * 100)} % upplyst`,
						moon.whole === "up"
							? "Uppe hela natten"
							: moon.whole === "down"
								? "Under horisonten hela natten"
								: moonTimes.map((item, index) => (
										<span key={item.word}>
											{index > 0 && ", "}
											{index > 0 ? item.word.toLowerCase() : item.word} {at(item.time)}
										</span>
									)),
					)}
					{planets.length > 0
						? planets.map(planet =>
								row(planet.name, <>Högst {at(planet.time)}, {Math.round(planet.at[1])}° i {direction(planet.at[0])}</>),
							)
						: row("Planeter", "Ingen över 10° medan det är mörkt")}
					{/* Regnens namn är långa, så de står i värdet under en gemensam term; annars blir
					    termkolumnen bred och värdena trånga på en telefon. */}
					{showers.length > 0 &&
						row(
							"Meteorer",
							showers.map(shower => (
								<span key={shower.name} className='block'>
									{shower.name}
									<span className='block text-text-muted'>
										{Math.round(shower.hourly)} i timmen omkring {at(shower.time)}
									</span>
								</span>
							)),
						)}
					{aurora
						? row(
								"Norrsken",
								<>
									Kp {aurora.kp.toLocaleString("sv-SE", { maximumFractionDigits: 1 })} omkring {at(aurora.time)}
								</>,
								auroraNote(aurora),
							)
						: row("Norrsken", "Ingen Kp-prognos för natten")}
				</dl>
			</>
		)
	}

	return (
		<section
			id='caelus-tonight'
			aria-label='I kväll'
			inert={!open}
			className={`absolute bottom-0 right-0 max-h-[calc(100%-3.5rem)] w-full max-w-sm overflow-y-auto bg-bg/90 [scrollbar-color:var(--text)_transparent] [scrollbar-width:thin] px-4 pb-3 pt-4 transition-[opacity,translate] duration-300 motion-reduce:transition-none sm:px-5 ${
				open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
			}`}>
			<div className='flex items-baseline justify-between gap-4'>
				<h2 className='font-display text-xl italic text-text'>I kväll</h2>
				<button
					type='button'
					onClick={onClose}
					className='cursor-pointer text-sm text-text-muted underline underline-offset-4 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring'>
					Stäng
				</button>
			</div>
			{content}
		</section>
	)
}
