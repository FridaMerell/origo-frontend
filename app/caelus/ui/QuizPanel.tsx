"use client"

import { geoStereographic } from "d3-geo"
import { useEffect, useMemo, useRef, useState } from "react"
import { useDarkMode } from "./CaelusTheme"
import { COUNTS, DEFAULT_COUNT, SELECTIONS, type Quiz, type QuizConstellation, type QuizSelection } from "./quiz"
import { drawArt, fetchArt } from "./sky/art"
import { drawStar } from "./sky/layers/stars"
import type { Art, StarRow } from "./sky/types"
import { ease } from "./sky/view"

// Som "Stäng" i InfoPanel.
const LINK =
	"cursor-pointer text-sm text-text-muted underline underline-offset-4 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
// Panelen ligger där InfoPanel ligger, nere till vänster.
const PANEL = "w-full max-w-sm px-4 pb-3 pt-4 sm:px-5"
const OVER_MAP = `absolute bottom-0 left-0 z-[5] bg-bg/90 ${PANEL}`

// Uppritningen: varje linje tar tid efter sin längd, med ett andetag mellan linjerna.
const DRAW_DELAY = 300
const DRAW_PER_PIXEL = 4
const DRAW_SHORTEST = 120
const DRAW_PAUSE = 160
// Hur länge en stjärna tar på sig att tändas när pennan når den, och teckningen att tona in.
const STAR_MILLISECONDS = 350
const ART_MILLISECONDS = 700
// Hur långt in från kanten teckningen tonar ut, som andel av ritytans kortaste sida.
const ART_FADE = 0.18
// Hur nära ett linjehörn (grader) en katalogstjärna ska stå för att ge hörnet sin storlek.
const ON_VERTEX = 0.3

const key = (point: [number, number]) => point.join(",")

/**
 * En stjärnbild ensam på plåten, med norr uppåt och öster åt vänster som i en stjärnatlas. Med
 * `animate` ritas den upp linje för linje och stjärnorna tänds när pennan når dem; `replay` ritar
 * upp den igen. Med `reveal` tonar teckningen in, om stjärnbilden har någon.
 */
function QuizFigure({
	constellation,
	stars,
	animate = false,
	replay = 0,
	reveal = false,
	strong = false,
	starScale = 1,
}: {
	constellation: QuizConstellation
	stars: StarRow[]
	animate?: boolean
	replay?: number
	reveal?: boolean
	strong?: boolean
	starScale?: number
}) {
	const wrapperRef = useRef<HTMLDivElement>(null)
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const [size, setSize] = useState({ width: 0, height: 0 })
	// Teckningen, som hämtas direkt så att den finns när man svarat rätt; null om den saknas.
	const [art, setArt] = useState<Art | null>(null)
	const drawStartRef = useRef(0)
	const artStartRef = useRef<number | null>(null)
	// Färgerna läses från temat när den ritar, så den ritas om när läget byts.
	const dark = useDarkMode()

	useEffect(() => {
		const observer = new ResizeObserver(([entry]) =>
			setSize({ width: entry.contentRect.width, height: entry.contentRect.height }),
		)
		observer.observe(wrapperRef.current!)
		return () => observer.disconnect()
	}, [])

	// Linjernas hörn med storleken på stjärnan som står där; katalogen är sorterad ljusast först.
	const vertices = useMemo(() => {
		const members = stars.filter(row => row[5] === constellation.id)
		const unique = new Map<string, [number, number]>()
		for (const line of constellation.lines) for (const point of line) unique.set(key(point), point)
		return [...unique.values()].map(point => {
			const cosine = Math.cos((point[1] * Math.PI) / 180)
			const star = members.find(row => {
				const across = ((((row[0] - point[0] + 540) % 360) - 180) * cosine)
				return Math.hypot(across, row[1] - point[1]) < ON_VERTEX
			})
			return { point, magnitude: star?.[2] ?? 4.5 }
		})
	}, [constellation, stars])

	useEffect(() => {
		drawStartRef.current = performance.now()
	}, [constellation.id, replay])

	useEffect(() => {
		let current = true
		fetchArt(constellation.id)
			.then(drawing => {
				if (current) setArt(drawing)
			})
			// Utan teckning står figuren ensam.
			.catch(() => {})
		return () => {
			current = false
		}
	}, [constellation.id])

	useEffect(() => {
		artStartRef.current = null
	}, [constellation.id, reveal])

	useEffect(() => {
		const canvas = canvasRef.current
		const { width, height } = size
		if (!canvas || width === 0 || height === 0) return
		const ratio = window.devicePixelRatio || 1
		canvas.width = Math.round(width * ratio)
		canvas.height = Math.round(height * ratio)
		const context = canvas.getContext("2d")
		if (!context) return
		const margin = Math.min(width, height) * 0.08
		const projection = geoStereographic()
			.rotate([-constellation.at[0], -constellation.at[1]])
			.reflectX(true)
			.fitExtent(
				[
					[margin, margin],
					[width - margin, height - margin],
				],
				{ type: "MultiLineString", coordinates: constellation.lines },
			)
		// Teckningen är större än figuren och ritas på ett eget lager, som tonar ut mot kanterna i
		// stället för att klippas tvärt där bilden slutar.
		const layer = document.createElement("canvas")
		layer.width = canvas.width
		layer.height = canvas.height
		const layerContext = layer.getContext("2d")!
		const fade = Math.min(width, height) * ART_FADE
		const edges = [
			layerContext.createLinearGradient(0, 0, width, 0),
			layerContext.createLinearGradient(0, 0, 0, height),
		]
		for (const [gradient, across] of edges.map((gradient, index) => [gradient, index === 0 ? width : height] as const)) {
			gradient.addColorStop(0, "transparent")
			gradient.addColorStop(fade / across, "black")
			gradient.addColorStop(1 - fade / across, "black")
			gradient.addColorStop(1, "transparent")
		}

		// Linjestyckena i tur och ordning, och när pennan når varje hörn.
		const segments: { from: [number, number]; to: [number, number]; start: number; duration: number }[] = []
		const reached = new Map<string, number>()
		let clock = animate ? DRAW_DELAY : 0
		for (const line of constellation.lines) {
			for (let index = 1; index < line.length; index++) {
				const from = projection(line[index - 1])
				const to = projection(line[index])
				if (!from || !to) continue
				const length = Math.hypot(to[0] - from[0], to[1] - from[1])
				const duration = animate ? Math.max(DRAW_SHORTEST, length * DRAW_PER_PIXEL) : 0
				if (!reached.has(key(line[index - 1]))) reached.set(key(line[index - 1]), clock)
				segments.push({ from, to, start: clock, duration })
				clock += duration
				if (!reached.has(key(line[index]))) reached.set(key(line[index]), clock)
			}
			if (animate) clock += DRAW_PAUSE
		}
		const finished = clock + STAR_MILLISECONDS

		let frame = 0
		const paint = (now: number) => {
			const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches
			const elapsed = still || !animate ? Infinity : now - drawStartRef.current
			const ink = getComputedStyle(canvas).color
			context.setTransform(ratio, 0, 0, ratio, 0, 0)
			context.clearRect(0, 0, width, height)
			context.lineJoin = "round"
			context.lineCap = "round"

			// Teckningen ligger under linjerna, som på kartan, och linjerna träder tillbaka för den.
			let covered = 0
			if (reveal && art) {
				artStartRef.current ??= now
				covered = still ? 1 : ease((now - artStartRef.current) / ART_MILLISECONDS)
				layerContext.globalCompositeOperation = "source-over"
				layerContext.setTransform(ratio, 0, 0, ratio, 0, 0)
				layerContext.clearRect(0, 0, width, height)
				drawArt(layerContext, projection, point => point, art, ink, covered)
				layerContext.globalAlpha = 1
				layerContext.globalCompositeOperation = "destination-in"
				for (const gradient of edges) {
					layerContext.fillStyle = gradient
					layerContext.fillRect(0, 0, width, height)
				}
				context.setTransform(1, 0, 0, 1, 0, 0)
				context.drawImage(layer, 0, 0)
				context.setTransform(ratio, 0, 0, ratio, 0, 0)
			}

			context.strokeStyle = ink
			context.lineWidth = strong ? 2.2 : 1.3
			context.globalAlpha = 1 - 0.8 * covered
			context.beginPath()
			for (const { from, to, start, duration } of segments) {
				const drawn = duration === 0 ? (elapsed >= start ? 1 : 0) : Math.min(1, (elapsed - start) / duration)
				if (drawn <= 0) continue
				context.moveTo(from[0], from[1])
				context.lineTo(from[0] + (to[0] - from[0]) * drawn, from[1] + (to[1] - from[1]) * drawn)
			}
			context.stroke()

			context.fillStyle = ink
			for (const { point, magnitude } of vertices) {
				const at = projection(point)
				const lit = Math.min(1, (elapsed - (reached.get(key(point)) ?? 0)) / STAR_MILLISECONDS)
				if (!at || lit <= 0) continue
				context.globalAlpha = lit
				drawStar(context, at[0], at[1], magnitude, starScale)
			}
			context.globalAlpha = 1

			if (elapsed < finished || (reveal && art && covered < 1)) frame = requestAnimationFrame(paint)
		}
		frame = requestAnimationFrame(paint)
		return () => cancelAnimationFrame(frame)
	}, [size, constellation, vertices, animate, replay, reveal, art, strong, starScale, dark])

	return (
		<div ref={wrapperRef} className='relative size-full min-h-0'>
			<canvas ref={canvasRef} aria-hidden className='absolute inset-0 size-full text-text' />
		</div>
	)
}

function Head({ title, close, onClose }: { title: string; close: string; onClose: () => void }) {
	return (
		<div className='flex items-baseline justify-between gap-4'>
			<h2 className='font-display text-xl italic text-text'>{title}</h2>
			<button type='button' onClick={onClose} className={LINK}>
				{close}
			</button>
		</div>
	)
}

/**
 * Quizet i stjärnbilder: valet av urval och antal, frågorna och resultatet. När en stjärnbild ska
 * pekas ut ligger panelen över kartan och kartan tar emot svaret (se SkyChart); de andra frågorna
 * har plåten för sig, med stjärnbilden där panelen inte når.
 */
export default function QuizPanel({
	quiz,
	constellations,
	stars,
	onStart,
	onAnswer,
	onNext,
	onRestart,
	onShow,
	onClose,
}: {
	quiz: Quiz | null
	constellations: Map<string, QuizConstellation>
	stars: StarRow[]
	onStart: (selection: QuizSelection, count: number) => void
	onAnswer: (id: string) => void
	onNext: () => void
	onRestart: () => void
	onShow: (id: string) => void
	onClose: () => void
}) {
	const [selection, setSelection] = useState<QuizSelection>("now")
	const [count, setCount] = useState(DEFAULT_COUNT)
	const name = (id: string) => constellations.get(id)?.name ?? id

	if (!quiz) {
		const choice = (pressed: boolean) =>
			`cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${
				pressed ? "text-text underline underline-offset-4" : "text-text-muted hover:text-text"
			}`
		return (
			<section aria-label='Quiz' className={OVER_MAP}>
				<Head title='Stjärnbildsquiz' close='Stäng' onClose={onClose} />
				<dl className='mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-1 text-sm'>
					<div className='col-span-2 grid grid-cols-subgrid'>
						<dt className='italic text-text-muted'>Urval</dt>
						<dd className='flex flex-wrap gap-x-3'>
							{SELECTIONS.map(item => (
								<button
									key={item.id}
									type='button'
									aria-pressed={selection === item.id}
									onClick={() => setSelection(item.id)}
									className={choice(selection === item.id)}>
									{item.label}
								</button>
							))}
						</dd>
					</div>
					<div className='col-span-2 grid grid-cols-subgrid'>
						<dt className='italic text-text-muted'>Frågor</dt>
						<dd className='flex flex-wrap gap-x-3 tabular-nums'>
							{COUNTS.map(item => (
								<button
									key={item}
									type='button'
									aria-pressed={count === item}
									onClick={() => setCount(item)}
									className={choice(count === item)}>
									{item}
								</button>
							))}
						</dd>
					</div>
				</dl>
				<div className='mt-3 flex justify-end'>
					<button type='button' onClick={() => onStart(selection, count)} className={LINK}>
						Börja
					</button>
				</div>
			</section>
		)
	}

	if (quiz.index >= quiz.questions.length) {
		const misses = quiz.questions
			.map((question, index) => ({ question, given: quiz.answers[index] }))
			.filter(({ question, given }) => given !== question.id)
		const verb = { draw: "du svarade", point: "du pekade på", pick: "du valde" }
		return (
			<section aria-label='Resultat' className={OVER_MAP}>
				<Head title={`${quiz.questions.length - misses.length} av ${quiz.questions.length} rätt`} close='Stäng' onClose={onClose} />
				<p className='text-sm text-text-muted'>{SELECTIONS.find(item => item.id === quiz.selection)?.label}</p>
				{misses.length > 0 && (
					<dl className='mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 text-sm'>
						{misses.map(({ question, given }) => (
							<div key={question.id} className='col-span-2 grid grid-cols-subgrid'>
								<dt>
									<button
										type='button'
										onClick={() => onShow(question.id)}
										className='cursor-pointer italic text-text underline underline-offset-4 hover:text-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring'>
										{name(question.id)}
									</button>
								</dt>
								<dd className='text-text-muted'>
									{verb[question.mode]} {name(given)}
								</dd>
							</div>
						))}
					</dl>
				)}
				<div className='mt-3 flex justify-end'>
					<button type='button' onClick={onRestart} className={LINK}>
						Ett nytt quiz
					</button>
				</div>
			</section>
		)
	}

	return (
		// Ny nyckel per fråga: uppritningen, svaret och det som pekas på börjar om.
		<Question
			key={quiz.index}
			quiz={quiz}
			constellations={constellations}
			stars={stars}
			onAnswer={onAnswer}
			onNext={onNext}
			onClose={onClose}
		/>
	)
}

function Question({
	quiz,
	constellations,
	stars,
	onAnswer,
	onNext,
	onClose,
}: {
	quiz: Quiz
	constellations: Map<string, QuizConstellation>
	stars: StarRow[]
	onAnswer: (id: string) => void
	onNext: () => void
	onClose: () => void
}) {
	const question = quiz.questions[quiz.index]
	const given = quiz.answers[quiz.index] ?? null
	const answered = given !== null
	const right = given === question.id
	const [replay, setReplay] = useState(0)
	const [hovered, setHovered] = useState<string | null>(null)
	const name = (id: string) => constellations.get(id)?.name ?? id
	const target = constellations.get(question.id)!
	const last = quiz.index === quiz.questions.length - 1

	const title =
		question.mode === "draw"
			? "Vilken stjärnbild ritas här?"
			: question.mode === "pick"
				? `Vilken bild är ${target.name}?`
				: `Var ligger ${target.name}?`
	const verdict = right
		? "Rätt."
		: question.mode === "draw"
			? `Fel. Det är ${target.name}.`
			: question.mode === "pick"
				? `Fel. Du valde ${name(given ?? "")}.`
				: `Fel. Du pekade på ${name(given ?? "")}.`

	const panel = (
		<section aria-label='Quiz' className={question.mode === "point" ? OVER_MAP : `${PANEL} shrink-0 self-start sm:w-sm sm:self-end`}>
			<p className='text-sm italic text-text-muted tabular-nums'>
				Fråga {quiz.index + 1} av {quiz.questions.length}
			</p>
			<Head title={title} close='Avsluta' onClose={onClose} />
			{question.mode === "draw" && (
				<ol className='mt-3 grid gap-1'>
					{question.options.map((id, index) => (
						<li key={id}>
							<button
								type='button'
								disabled={answered}
								onClick={() => onAnswer(id)}
								className='group grid w-full cursor-pointer grid-cols-[1.4em_minmax(0,1fr)] text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-default'>
								<span className='italic text-text-muted'>{"abc"[index]}</span>
								<span
									className={
										answered
											? id === question.id
												? "text-text underline underline-offset-4"
												: id === given
													? "text-text"
													: "text-text-muted"
											: "text-text group-hover:underline group-hover:underline-offset-4"
									}>
									{name(id)}
								</span>
							</button>
						</li>
					))}
				</ol>
			)}
			{question.mode === "point" && !answered && <p className='mt-2 text-sm text-text-muted'>Klicka på himlen.</p>}
			{/* Svaret har sin plats redan innan man svarat, så att panelen inte växer och flyttar bilden. */}
			<div aria-live='polite' className={answered || question.mode !== "point" ? "" : "hidden"}>
				<p className={`mt-3 ${answered ? "" : "invisible"}`}>
					{verdict} <span className='italic text-text-muted'>{target.latin}</span>
				</p>
				<div className={`mt-2.5 flex justify-end gap-4 ${answered ? "" : "invisible"}`}>
					{question.mode === "draw" && (
						<button type='button' onClick={() => setReplay(value => value + 1)} className={`${LINK} mr-auto`}>
							Rita igen
						</button>
					)}
					<button type='button' onClick={onNext} disabled={!answered} className={LINK}>
						{last ? "Se resultatet" : "Nästa"}
					</button>
				</div>
			</div>
		</section>
	)

	if (question.mode === "point") return panel

	return (
		// Plåten för sig: stjärnbilden ovanför panelen på en telefon, bredvid den på en större skärm.
		<div className='absolute inset-0 z-[5] flex flex-col-reverse bg-bg sm:flex-row'>
			{panel}
			<div className='relative min-h-0 flex-1 px-4 pb-2 pt-14 sm:pb-6'>
				{question.mode === "draw" ? (
					<QuizFigure constellation={target} stars={stars} animate replay={replay} reveal={right} />
				) : (
					<div className='grid h-full grid-cols-3 gap-3'>
						{question.options.map((id, index) => (
							<button
								key={id}
								type='button'
								aria-label={`Bild ${"abc"[index]}`}
								disabled={answered}
								onClick={() => onAnswer(id)}
								onPointerEnter={() => setHovered(id)}
								onPointerLeave={() => setHovered(null)}
								className={`flex min-h-0 cursor-pointer flex-col items-center gap-1.5 transition-opacity duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-default motion-reduce:transition-none ${
									answered && id !== question.id ? "opacity-30" : ""
								}`}>
								<span className='block min-h-0 w-full flex-1'>
									<QuizFigure
										constellation={constellations.get(id)!}
										stars={stars}
										reveal={right && id === question.id}
										strong={answered ? id === question.id : hovered === id}
										starScale={0.8}
									/>
								</span>
								<span className='italic text-text-muted'>{"abc"[index]}</span>
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	)
}
