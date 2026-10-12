import { select } from "d3-selection"
import { zoom, zoomIdentity, type D3ZoomEvent, type ZoomTransform } from "d3-zoom"
import { pickBody, pickFigure, pickStar } from "./pick"
import { drawScene } from "./render"
import type { Art, ArtFile, Figure, Level, Scene } from "./types"
import { dialGeometry, DIRECTION } from "./dial"
import {
	degreesPerPixel,
	dialShownAt,
	ease,
	lowestAltitude,
	makeProjection,
	START_VIEW,
	ZOOM_EXTENT,
} from "./view"

const INTRO_MILLISECONDS = 2200
const FIGURE_INTRO_MILLISECONDS = 1400
const OUTGOING_MILLISECONDS = 450
// Tidskonstanten för hur fort en figur lyfts fram och sjunker tillbaka.
const LEVEL_MILLISECONDS = 90

export type Painter = ReturnType<typeof createPainter>

/**
 * Det som ritar kartan och håller i allt som rör sig på den: blickriktningen, inladdningen och
 * framlyftningen av figurer och stjärnor. Ligger utanför React, eftersom det ändras varje
 * bildruta; komponenten talar bara om vad som gäller (himmel, vad som pekas ut och är valt).
 */
export function createPainter(
	canvas: HTMLCanvasElement,
	wrapper: HTMLElement,
	// Kalenderskivan vrids: tiden den nu visar, och om handen fortfarande håller i den.
	onTurn: (time: number, turning: boolean) => void,
) {
	const view = { ...START_VIEW }
	let scene: Scene | null = null
	let width = 0
	let height = 0
	let frame = 0
	let lastFrame = 0
	// När stjärnorna respektive figurerna började träda fram; null tills katalogen har kommit.
	let introStart: number | null = null
	let figureStart: number | null = null
	let outgoing: { figures: Figure[]; since: number } | null = null
	let hovered: string | null = null
	let selected: string | null = null
	let star: number | null = null
	// Planetfokus: om det är valt, och hur långt det har tonat in.
	let planetFocus = false
	let planetLevel = 0
	// Och norrskensfokus.
	let auroraFocus = false
	let auroraLevel = 0
	// Hur långt övrig text har tonats ner för en framlyft figur.
	let liftLevel = 0
	const levels = new Map<string, Level>()
	const markLevels = new Map<number, number>()
	// Teckningar som hämtats, och de som är på väg, efter figurens id.
	const art = new Map<string, Art>()
	const artRequested = new Set<string>()
	let artIndex: Promise<Record<string, ArtFile>> | null = null

	function redraw() {
		cancelAnimationFrame(frame)
		frame = requestAnimationFrame(paint)
	}

	function paint(time: number) {
		if (!scene || width === 0 || height === 0) return
		const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches
		const progress = (since: number | null, duration: number) =>
			since === null ? 0 : still ? 1 : Math.min(1, Math.max(0, (time - since) / duration))
		const intro = progress(introStart, INTRO_MILLISECONDS)
		const figureIntro = progress(figureStart, FIGURE_INTRO_MILLISECONDS)
		const left = outgoing ? progress(outgoing.since, OUTGOING_MILLISECONDS) : 1
		if (left >= 1) outgoing = null

		// Varje nivå går en bråkdel av vägen mot sitt mål per bildruta, oberoende av bildfrekvens.
		const step = still ? 1 : 1 - Math.exp(-Math.min(100, time - lastFrame) / LEVEL_MILLISECONDS)
		lastFrame = time
		let settling = false
		const approach = (value: number, target: number, rate = 1) => {
			const next = Math.abs(target - value) < 0.01 ? target : value + (target - value) * step * rate
			if (next !== target) settling = true
			return next
		}

		for (const id of [hovered, selected]) {
			if (id !== null && !levels.has(id)) levels.set(id, { hover: 0, select: 0 })
		}
		for (const [id, level] of levels) {
			level.hover = approach(level.hover, id === hovered ? 1 : 0)
			level.select = approach(level.select, id === selected ? 1 : 0)
			if (level.hover === 0 && level.select === 0) levels.delete(id)
		}
		for (const drawing of art.values()) drawing.arrived = approach(drawing.arrived, 1, 0.5)
		planetLevel = approach(planetLevel, planetFocus ? 1 : 0, 0.5)
		auroraLevel = approach(auroraLevel, auroraFocus ? 1 : 0, 0.5)
		// Övrig text tonas ner när en figur är vald, inte när den bara pekas ut: pekaren står
		// alltid över någon stjärnbild, så då vore texten aldrig i fred. Den kommer tillbaka
		// långsamt, så att ett byte från en vald figur till en annan inte hinner blinka.
		const lifting = selected !== null
		liftLevel = approach(liftLevel, lifting ? 1 : 0, lifting ? 0.3 : 0.06)
		if (star !== null && !markLevels.has(star)) markLevels.set(star, 0)
		const marks = []
		for (const [index, level] of markLevels) {
			const next = approach(level, index === star ? 1 : 0)
			if (next === 0) markLevels.delete(index)
			else markLevels.set(index, next)
			const at = scene.starByIndex.get(index)?.at
			if (at && next > 0) marks.push({ at, level: next })
		}

		drawScene(canvas, {
			scene,
			view,
			width,
			height,
			intro,
			figureIntro,
			levels,
			outgoing: outgoing && { figures: outgoing.figures, alpha: 1 - ease(left) },
			marks,
			art,
			planetFocus: planetLevel,
			auroraFocus: auroraLevel,
			lifted: liftLevel,
		})
		if ((introStart !== null && (intro < 1 || figureIntro < 1)) || outgoing || settling) redraw()
	}

	// Teckningen hämtas första gången dess stjärnbild pekas ut eller väljs, och förteckningen
	// över teckningar första gången det händer; den tonar in när den är framme.
	function loadArt(id: string) {
		if (artRequested.has(id)) return
		artRequested.add(id)
		artIndex ??= fetch("/data/figures.json")
			.then(response => (response.ok ? response.json() : Promise.reject()))
			.then((payload: { figures: Record<string, ArtFile> }) => payload.figures)
		artIndex
			.then(async figures => {
				const file = figures[id]
				if (!file) return
				const picture = new Image()
				picture.src = file.image
				await picture.decode()
				art.set(id, { ...file, picture, tinted: null, arrived: 0 })
				redraw()
			})
			.catch(() => {
				// Nästa gång försöker på nytt.
				artRequested.delete(id)
				artIndex = null
			})
	}

	let placed = false
	const observer = new ResizeObserver(([entry]) => {
		width = entry.contentRect.width
		height = entry.contentRect.height
		if (!placed && width > 0 && height > 0) {
			placed = true
			view.altitude = lowestAltitude(width, height, view.zoom, true)
		}
		view.altitude = Math.max(view.altitude, lowestAltitude(width, height, view.zoom))
		redraw()
	})
	observer.observe(wrapper)

	// Kalenderskivans ringar under en punkt i fönstret, om de syns och punkten ligger på dem.
	const dialAt = (clientX: number, clientY: number) => {
		if (!scene || dialShownAt(view.zoom) < 0.5) return null
		const dial = dialGeometry(makeProjection(view, width, height), view)
		if (!dial) return null
		const bounds = canvas.getBoundingClientRect()
		const x = clientX - bounds.left - dial.x
		const y = clientY - bounds.top - dial.y
		const distance = Math.hypot(x, y)
		if (distance < dial.inner - 4 || distance > dial.outer + 8) return null
		const ring: "date" | "hour" = distance < dial.inner + dial.band ? "date" : "hour"
		return { dial, ring, angle: Math.atan2(y, x) }
	}

	// Ringen man tar i följer handen och den andra står still. Ett tag i timringen vrider
	// klockslaget, ett varv per dygn; ett tag i datumringen vrider dagen med klockslaget kvar, ett
	// varv per år. Himlen vrids med tiden i båda fallen.
	let turning: {
		ring: "date" | "hour"
		days: number
		angle: number
		turned: number
		from: number
		time: number
	} | null = null
	let justTurned = false
	const onPointerDown = (event: PointerEvent) => {
		const grip = dialAt(event.clientX, event.clientY)
		if (!grip || !scene || event.button !== 0) return
		canvas.setPointerCapture(event.pointerId)
		turning = {
			ring: grip.ring,
			days: scene.dial.days.length,
			angle: grip.angle,
			turned: 0,
			from: scene.dial.time,
			time: scene.dial.time,
		}
		onTurn(turning.time, true)
	}
	const onPointerMove = (event: PointerEvent) => {
		if (!turning) return
		// Också utanför ringarna följer vridningen handen, kring samma mitt.
		const dial = dialGeometry(makeProjection(view, width, height), view)
		if (!dial) return
		const bounds = canvas.getBoundingClientRect()
		const angle = Math.atan2(event.clientY - bounds.top - dial.y, event.clientX - bounds.left - dial.x)
		const step = ((angle - turning.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI
		turning.angle = angle
		turning.turned += step
		// Ringen följer handen, så tiden vid visaren flyttas lika långt som ringen vridits: framåt
		// när den vrids mot sin egen riktning, så att senare dagar och timmar kommer fram.
		const turns = -(DIRECTION * turning.turned) / (Math.PI * 2)
		if (turning.ring === "hour") {
			turning.time = turning.from + turns * 24 * 3_600_000
		} else {
			// Hela dagar i lokal tid, så att klockslaget står kvar också över en tidsomställning.
			const date = new Date(turning.from)
			date.setDate(date.getDate() + Math.round(turns * turning.days))
			turning.time = date.getTime()
		}
		onTurn(turning.time, true)
	}
	const onPointerEnd = () => {
		if (!turning) return
		onTurn(turning.time, false)
		turning = null
		justTurned = true
	}
	canvas.addEventListener("pointerdown", onPointerDown)
	canvas.addEventListener("pointermove", onPointerMove)
	canvas.addEventListener("pointerup", onPointerEnd)
	canvas.addEventListener("pointercancel", onPointerEnd)

	// d3-zoom sköter mus, hjul och nyp. Förflyttningen blir en ny blickriktning i stället för
	// en förskjutning av bilden, så horisonten ligger kvar vågrätt.
	let last: ZoomTransform = zoomIdentity
	const behavior = zoom<HTMLCanvasElement, unknown>()
		.scaleExtent(ZOOM_EXTENT)
		// Som d3-zooms eget filter, men ett tag i kalenderskivan ska vrida den, inte panorera.
		.filter((event: MouseEvent | TouchEvent | WheelEvent) => {
			if (event.type === "wheel") return true
			if ("ctrlKey" in event && event.ctrlKey) return false
			if ("button" in event && event.button) return false
			const point = "touches" in event ? event.touches[0] : event
			return !point || !dialAt(point.clientX, point.clientY)
		})
		.on("zoom", (event: D3ZoomEvent<HTMLCanvasElement, unknown>) => {
			const transform = event.transform
			if (event.sourceEvent?.type !== "wheel") {
				const degrees = degreesPerPixel(width, height, transform.k)
				view.azimuth = (view.azimuth - (transform.x - last.x) * degrees + 360) % 360
				view.altitude += (transform.y - last.y) * degrees
			}
			view.zoom = transform.k
			view.altitude = Math.min(90, Math.max(lowestAltitude(width, height, view.zoom), view.altitude))
			last = transform
			redraw()
		})
	const selection = select(canvas)
	selection.call(behavior)

	// Text som ritats innan typsnittet hunnit läsas in står kvar i reservtypsnittet annars.
	document.fonts.ready.then(redraw)

	return {
		redraw,
		/** Ny himmel att rita. Första gången den har stjärnor börjar inladdningen. */
		setScene(next: Scene) {
			scene = next
			if (next.stars.length > 0 && introStart === null) {
				// Figurerna börjar graveras när de ljusaste stjärnorna redan har tänts.
				introStart = performance.now()
				figureStart = introStart + INTRO_MILLISECONDS * 0.35
			}
			redraw()
		},
		/** Inför ett byte av himmel: de gamla figurerna tonar ut medan de nya graveras in. */
		changeFigures() {
			const time = performance.now()
			if (scene) outgoing = { figures: scene.figures, since: time }
			figureStart = time + OUTGOING_MILLISECONDS * 0.5
			hovered = null
			selected = null
			levels.clear()
		},
		setHovered(id: string | null) {
			if (hovered === id) return false
			hovered = id
			if (id !== null) loadArt(id)
			redraw()
			return true
		},
		setSelected(id: string | null) {
			selected = id
			if (id !== null) loadArt(id)
			redraw()
		},
		setStar(index: number | null) {
			star = index
			redraw()
		},
		/** Lyfter fram solen, månen och planeterna och låter resten av himlen träda tillbaka. */
		setPlanetFocus(on: boolean) {
			if (planetFocus === on) return
			planetFocus = on
			redraw()
		},
		/** Lyfter fram var norrsken kan synas och låter resten av himlen träda tillbaka. */
		setAuroraFocus(on: boolean) {
			if (auroraFocus === on) return
			auroraFocus = on
			redraw()
		},
		get hovered() {
			return hovered
		},
		get selected() {
			return selected
		},
		get star() {
			return star
		},
		figureAt(x: number, y: number) {
			return scene ? pickFigure(scene, view, width, height, x, y) : null
		},
		starAt(x: number, y: number) {
			return scene ? pickStar(scene, view, width, height, x, y) : null
		},
		bodyAt(x: number, y: number) {
			return scene ? pickBody(scene, view, width, height, x, y) : null
		},
		/** Sant en gång efter att kalenderskivan vridits, så att släppet inte räknas som ett klick. */
		consumeTurn() {
			const turned = justTurned
			justTurned = false
			return turned
		},
		destroy() {
			observer.disconnect()
			selection.on(".zoom", null)
			canvas.removeEventListener("pointerdown", onPointerDown)
			canvas.removeEventListener("pointermove", onPointerMove)
			canvas.removeEventListener("pointerup", onPointerEnd)
			canvas.removeEventListener("pointercancel", onPointerEnd)
			cancelAnimationFrame(frame)
		},
	}
}
