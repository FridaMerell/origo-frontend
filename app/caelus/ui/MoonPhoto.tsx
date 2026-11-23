"use client"

import { MoonPhase } from "astronomy-engine"
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react"
import { useDarkMode } from "./CaelusTheme"
import { direction, moonPhaseName } from "./sky-info"
import { photoDays, type MoonMoment, type PhotoDay } from "./sky/moon-photo"
import { parsePosition, POSITION_KEY, UPPSALA } from "./SkyChart"
import { useClock } from "./use-clock"
import { useStored } from "@/app/lib/use-stored"
import { formatMonthName, formatTime, formatWeekday, formatWeekdayDate } from "@/app/lib/formatters"

// Väderstrecken på horisonten, var 45:e grad.
const COMPASS = ["N", "NO", "O", "SO", "S", "SV", "V", "NV"]

const LINK =
	"cursor-pointer text-text underline underline-offset-4 hover:text-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-default disabled:text-text-muted disabled:no-underline"

type Selection = { day: number; moment: number }

/**
 * Månen i sin fas: kontur, och den upplysta delen mellan randen och terminatorn. Tilltagande
 * måne är upplyst till höger, avtagande till vänster, sett från norra halvklotet. Den upplysta
 * delen har alltid den ljusa färgen: bläcket i mörkt läge, papperet i ljust.
 */
function drawMoon(
	c: CanvasRenderingContext2D,
	x: number,
	y: number,
	r: number,
	lit: number,
	waning: boolean,
	ink: string,
	paper: string,
	dark: boolean,
) {
	const bright = dark ? ink : paper
	const shade = dark ? paper : ink
	c.save()
	c.lineWidth = 1
	c.strokeStyle = ink
	c.fillStyle = shade
	c.beginPath()
	c.arc(x, y, r, 0, Math.PI * 2)
	c.fill()
	c.stroke()
	if (lit > 0.01) {
		c.fillStyle = bright
		c.beginPath()
		// Den upplysta randen, uppifrån och ner på den upplysta sidan.
		c.arc(x, y, r, -Math.PI / 2, Math.PI / 2, waning)
		// Terminatorn tillbaka upp: en halv ellips, mot den upplysta sidan när mindre än halva är upplyst.
		const width = Math.abs(1 - 2 * lit) * r
		const towardLit = lit < 0.5
		c.ellipse(x, y, width, r, 0, Math.PI / 2, -Math.PI / 2, waning ? !towardLit : towardLit)
		c.fill()
	}
	c.restore()
}

// En liten måne i dagremsan.
function PhaseDot({ lit, waning }: { lit: number; waning: boolean }) {
	const ref = useRef<HTMLCanvasElement>(null)
	const dark = useDarkMode()
	useEffect(() => {
		const canvas = ref.current
		if (!canvas) return
		const scale = window.devicePixelRatio || 1
		canvas.width = 18 * scale
		canvas.height = 18 * scale
		const c = canvas.getContext("2d")
		if (!c) return
		c.setTransform(scale, 0, 0, scale, 0, 0)
		c.clearRect(0, 0, 18, 18)
		const style = getComputedStyle(canvas)
		drawMoon(c, 9, 9, 7.5, lit, waning, style.getPropertyValue("--text"), style.getPropertyValue("--bg"), dark)
	}, [lit, waning, dark])
	return <canvas ref={ref} aria-hidden className='size-[18px]' />
}

// Horisonten kring månen vid ögonblicket: graverad himmel, mark, väderstreck, månen och solen.
function Horizon({ moment, turn, onTurn }: { moment: MoonMoment | null; turn: number; onTurn: (turn: number) => void }) {
	const ref = useRef<HTMLCanvasElement>(null)
	const dark = useDarkMode()
	const dragRef = useRef<{ x: number; turn: number; span: number; width: number } | null>(null)
	const [size, setSize] = useState({ width: 0, height: 0 })

	useEffect(() => {
		const canvas = ref.current
		if (!canvas) return
		const observer = new ResizeObserver(([entry]) =>
			setSize({ width: entry.contentRect.width, height: entry.contentRect.height }),
		)
		observer.observe(canvas)
		return () => observer.disconnect()
	}, [])

	// Ett halvt varv på en telefon, hela varvet på en bred skärm.
	const span = size.width >= 640 ? 360 : 180

	useEffect(() => {
		const canvas = ref.current
		if (!canvas || !size.width || !size.height) return
		const scale = window.devicePixelRatio || 1
		canvas.width = size.width * scale
		canvas.height = size.height * scale
		const c = canvas.getContext("2d")
		if (!c) return
		c.setTransform(scale, 0, 0, scale, 0, 0)
		const { width, height } = size
		c.clearRect(0, 0, width, height)
		const style = getComputedStyle(canvas)
		const ink = style.getPropertyValue("--text")
		const muted = style.getPropertyValue("--text-muted")
		const paper = style.getPropertyValue("--bg")
		const font = style.fontFamily
		const ground = height * 0.7
		const degree = Math.min(14, height / 24)
		const center = (moment ? moment.azimuth : 180) + turn
		const xOf = (azimuth: number) => width / 2 + ((((azimuth - center + 540) % 360) - 180) / span) * width
		// Markens kontur: en lätt kuperad linje, densamma vid varje ritning.
		const groundAt = (x: number) => ground - 3 * Math.sin(x / 37) - 2 * Math.sin(x / 11)

		// Himlen skrafferas tätare ju mörkare den är.
		const sunAltitude = moment?.sunAltitude ?? 0
		const darkness = Math.min(1, Math.max(0, (6 - sunAltitude) / 18))
		const gap = 14 - darkness * 10
		c.strokeStyle = ink
		c.lineWidth = 0.6
		c.globalAlpha = 0.28
		for (let y = ground - 4; y > 0; y -= gap) {
			c.beginPath()
			c.moveTo(0, y)
			c.lineTo(width, y)
			c.stroke()
		}
		c.globalAlpha = 1

		c.fillStyle = paper
		c.beginPath()
		c.moveTo(0, height)
		for (let x = 0; x <= width; x += 6) c.lineTo(x, groundAt(x))
		c.lineTo(width, height)
		c.closePath()
		c.fill()
		c.lineWidth = 1
		c.beginPath()
		for (let x = 0; x <= width; x += 6) (x === 0 ? c.moveTo : c.lineTo).call(c, x, groundAt(x))
		c.stroke()

		// Gradstreck var femte grad och väderstreck var 45:e, under marken.
		c.fillStyle = ink
		c.textAlign = "center"
		c.font = `italic 18px ${font}`
		for (let azimuth = 0; azimuth < 360; azimuth += 5) {
			const x = xOf(azimuth)
			if (x < -2 || x > width + 2) continue
			const major = azimuth % 45 === 0
			c.globalAlpha = major ? 1 : 0.5
			c.beginPath()
			c.moveTo(x, ground + 8)
			c.lineTo(x, ground + (major ? 20 : azimuth % 15 === 0 ? 14 : 11))
			c.stroke()
			// Ett väderstreck ända ut vid kanten skulle klippas av ramen.
			if (major && x > 14 && x < width - 14) c.fillText(COMPASS[azimuth / 45], x, ground + 40)
		}
		c.globalAlpha = 1

		// Solen: streckad när den står under horisonten.
		if (moment) {
			const sx = xOf(moment.sunAzimuth)
			if (sx > 12 && sx < width - 12) {
				// Långt under horisonten hamnar solen nederst, med namnet bredvid i stället för under.
				const sy = Math.min(height - 14, Math.max(14, ground - moment.sunAltitude * degree))
				c.setLineDash(moment.sunAltitude < 0 ? [3, 3] : [])
				c.beginPath()
				c.arc(sx, sy, 9, 0, Math.PI * 2)
				c.stroke()
				c.setLineDash([])
				c.fillStyle = muted
				c.font = `italic 16px ${font}`
				const below = sy + 28 <= height - 4
				const right = sx + 60 < width
				c.textAlign = below ? "center" : right ? "left" : "right"
				c.fillText("solen", below ? sx : right ? sx + 15 : sx - 15, below ? sy + 28 : sy + 5)
			}
			// Månen vid horisonten, med ett lodstreck ner till riktningen.
			const mx = xOf(moment.azimuth)
			const radius = width >= 640 ? 12 : 15
			const my = ground - radius - 6
			c.setLineDash([2, 3])
			c.beginPath()
			c.moveTo(mx, ground + 6)
			c.lineTo(mx, my + radius)
			c.stroke()
			c.setLineDash([])
			drawMoon(c, mx, my, radius, moment.lit, moment.waning, ink, paper, dark)
		}
	}, [moment, turn, size, span, dark])

	const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
		event.currentTarget.setPointerCapture(event.pointerId)
		dragRef.current = { x: event.clientX, turn, span, width: size.width || 1 }
	}
	const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
		const drag = dragRef.current
		if (!drag) return
		// Att dra åt höger visar det som ligger åt vänster, som när man vrider på sig.
		onTurn(drag.turn - ((event.clientX - drag.x) / drag.width) * drag.span)
	}

	return (
		<canvas
			ref={ref}
			role='img'
			aria-label={
				moment
					? `Horisonten mot ${direction(moment.azimuth)}, där månen ${moment.kind === "rise" ? "går upp" : "går ner"}. Dra i sidled för att vrida.`
					: "Horisonten"
			}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={() => (dragRef.current = null)}
			onPointerCancel={() => (dragRef.current = null)}
			className='block size-full cursor-grab touch-none font-display text-text active:cursor-grabbing'
		/>
	)
}

// Vad solens höjd betyder för bilden, i klartext.
const LIGHT_EFFECT: Record<MoonMoment["light"], string> = {
	day: "himlen är ljus och månen blek",
	golden: "svagt, varmt ljus, så landskapet runt månen syns i bilden",
	blue: "himlen är blå och ungefär lika ljus som månen, så både månen och landskapet syns i bilden",
	dark: "himlen är svart och landskapet syns knappt bredvid månen",
}

function lightNote(moment: MoonMoment) {
	const degrees = Math.abs(Math.round(moment.sunAltitude))
	const sun = degrees === 0 ? "Solen vid horisonten" : `Solen ${degrees}° ${moment.sunAltitude < 0 ? "under" : "över"} horisonten`
	return `${sun}: ${LIGHT_EFFECT[moment.light]}.`
}

function phaseNote(moment: MoonMoment) {
	const phase = moonPhaseName(MoonPhase(new Date(moment.time)))
	const lit = `${phase}, ${Math.round(moment.lit * 100)} % upplyst`
	return lit
}

function capitalized(text: string) {
	return text.charAt(0).toUpperCase() + text.slice(1)
}

// Det första bra tillfället från en tidpunkt, annars dagens första upp- eller nedgång.
function firstSelection(days: PhotoDay[], from: number): Selection {
	for (let day = 0; day < days.length; day++) {
		const moment = days[day].moments.findIndex(item => item.good && item.time >= from)
		if (moment !== -1) return { day, moment }
	}
	return { day: 0, moment: 0 }
}

/** Månfoto: när och var månen går upp och ner, och i vilket ljus, de kommande 30 dagarna. */
export default function MoonPhoto() {
	const now = useClock()
	const [storedPosition] = useStored(POSITION_KEY)
	const position = useMemo(() => parsePosition(storedPosition) ?? UPPSALA, [storedPosition])
	// Dygnen räknas om när dagen eller platsen byts, inte varje minut.
	const dayKey = now ? `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}` : null
	const days = useMemo(() => (dayKey && now ? photoDays(now, position) : []), [dayKey, position])
	const [selection, setSelection] = useState<Selection | null>(null)
	const [turn, setTurn] = useState(0)
	const stripRef = useRef<HTMLDivElement>(null)

	const chosen = selection ?? (days.length > 0 && now ? firstSelection(days, now.getTime()) : null)
	const day = chosen ? days[chosen.day] : null
	const moment = day?.moments[chosen?.moment ?? 0] ?? null

	// Alla bra tillfällen i ordning, för Föregående och Nästa.
	const good = useMemo(
		() =>
			days.flatMap((item, dayIndex) =>
				item.moments.flatMap((entry, momentIndex) => (entry.good ? [{ day: dayIndex, moment: momentIndex, time: entry.time }] : [])),
			),
		[days],
	)
	const current = moment?.time ?? day?.start ?? 0
	const previous = [...good].reverse().find(item => item.time < current) ?? null
	const next = good.find(item => item.time > current) ?? null

	const choose = (target: Selection) => {
		setSelection(target)
		setTurn(0)
	}

	useEffect(() => {
		stripRef.current?.querySelector("[aria-current='date']")?.scrollIntoView({ inline: "center", block: "nearest" })
	}, [chosen?.day])

	if (!now || !day) {
		return <p className='px-6 pt-16 text-lg italic text-text-muted'>Räknar ut månens gång …</p>
	}

	const ends = [days[0].start, days[days.length - 1].start]
	const months = [...new Set(ends.map(time => formatMonthName(time)))].join("–")
	// I mobilen får månaderna inte trängas mellan Föregående och Nästa.
	const shortMonths = [...new Set(ends.map(time => formatMonthName(time, { short: true })))].join("–")

	return (
		<div className='flex min-h-0 flex-1 flex-col'>
			<div className='flex flex-col gap-0.5 px-5 pt-5 sm:px-8 sm:pt-8'>
				<p className='text-md italic text-text-muted lg:text-lg'>{capitalized(formatWeekdayDate(day.start))}</p>
				{moment ? (
					<>
						<p className='text-3xl leading-none text-text lg:text-[5.5rem]'>
							{moment.kind === "rise" ? "Upp" : "Ner"} {formatTime(moment.time)}
						</p>
						<p className='text-lg text-text lg:text-xl'>
							{Math.round(moment.azimuth)}° · {direction(moment.azimuth)}
						</p>
						<p className='mt-1.5 text-sm text-text'>{phaseNote(moment)}</p>
						<p className='text-sm text-text-muted'>{lightNote(moment)}</p>
					</>
				) : (
					<p className='text-lg text-text'>Månen går varken upp eller ner den här dagen.</p>
				)}
			</div>

			<div className='relative mt-2 min-h-40 flex-1'>
				<div className='absolute inset-0'>
					<Horizon moment={moment} turn={turn} onTurn={setTurn} />
				</div>
			</div>

			<div className='pb-3 pt-2.5'>
				<div className='flex items-baseline justify-between px-4 pb-1.5 text-sm'>
					<button type='button' disabled={!previous} onClick={() => previous && choose(previous)} className={`${LINK} py-1`}>
						‹ Föregående
					</button>
					<span className='italic text-text-muted'>
						<span className='sm:hidden'>{shortMonths}</span>
						<span className='hidden sm:inline'>{months}</span>
					</span>
					<button type='button' disabled={!next} onClick={() => next && choose(next)} className={`${LINK} py-1`}>
						Nästa ›
					</button>
				</div>
				<div
					ref={stripRef}
					// Dagarna tonar ut mot kanterna i stället för att klippas av ramen, som linjalen i tidsraden.
					// Varje dag får minst en fingerbredd; finns det mer plats delas den lika, annars rullar remsan.
					className='grid auto-cols-[minmax(2.75rem,1fr)] grid-flow-col overflow-x-auto px-6 mask-[linear-gradient(90deg,transparent,black_6%,black_94%,transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
					{days.map((item, index) => {
						const on = index === chosen?.day
						return (
							<button
								key={item.start}
								type='button'
								aria-current={on ? "date" : undefined}
								aria-label={`${formatWeekdayDate(item.start)}${item.good ? ", bra tillfälle" : ""}`}
								onClick={() => {
									const first = item.moments.findIndex(entry => entry.good)
									choose({ day: index, moment: Math.max(0, first) })
								}}
								className={`flex cursor-pointer flex-col items-center gap-1 pb-1 pt-1.5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring ${
									on ? "outline outline-1 -outline-offset-1 outline-text" : ""
								} ${item.good ? "text-text" : "text-text-muted"}`}>
								<span className='text-xs'>{formatWeekday(item.start, { short: true })}</span>
								<PhaseDot lit={item.lit} waning={item.waning} />
								<span className={`text-sm ${item.good ? "underline underline-offset-4" : ""}`}>
									{new Date(item.start).getDate()}
								</span>
							</button>
						)
					})}
				</div>
				{day.moments.length > 0 && (
					<div className='flex justify-center gap-6 pt-1.5 text-sm'>
						{/* En gång i månaden hinner månen inte gå upp, eller ner, under dygnet. */}
						{!day.moments.some(entry => entry.kind === "rise") && (
							<span className='py-1 italic text-text-muted'>Går inte upp</span>
						)}
						{day.moments.map((entry, index) => (
							<button
								key={entry.kind}
								type='button'
								aria-pressed={index === chosen?.moment}
								onClick={() => choose({ day: chosen?.day ?? 0, moment: index })}
								className={`cursor-pointer py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${
									index === chosen?.moment ? "text-text underline underline-offset-4" : "text-text-muted hover:text-text"
								}`}>
								{entry.kind === "rise" ? "Upp" : "Ner"} {formatTime(entry.time)}
							</button>
						))}
						{!day.moments.some(entry => entry.kind === "set") && (
							<span className='py-1 italic text-text-muted'>Går inte ner</span>
						)}
					</div>
				)}
			</div>
		</div>
	)
}
