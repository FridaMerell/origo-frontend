import { select } from "d3-selection"
import { zoom, zoomIdentity, type D3ZoomEvent, type ZoomTransform } from "d3-zoom"
import { auroraAt } from "./aurora"
import type { Direction } from "./compass"
import { auroraMoving } from "./layers/aurora"
import { meteorsWait } from "./layers/meteors"
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
// Hur ofta kartan ritas om för norrskenets rörelse.
const MOTION_MILLISECONDS = 90
// Hur fort norrskenet glider till ett nytt Kp-värde, jämfört med när en figur lyfts fram.
const KP_RATE = 0.2
// Väderstrecken drar lätt i blicken medan man vrider: så många grader på var sida om vart och
// ett av de fyra går himlen trögare, så att den gärna stannar på det.
const MAGNET_DEGREES = 8

// Blickriktningen för den riktning handen har vridit till. Mitt på ett väderstreck följer blicken
// handen knappt alls; mot zonens kant allt fortare, och vid kanten lika fort som annars, så att
// inget hack känns när den släpper.
function magnetic(azimuth: number) {
	const cardinal = Math.round(azimuth / 90) * 90
	const offset = azimuth - cardinal
	const share = Math.abs(offset) / MAGNET_DEGREES
	if (share >= 1) return azimuth
	return (cardinal + Math.sign(offset) * MAGNET_DEGREES * share * share * (2 - share) + 360) % 360
}

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
	// Kp-värdet norrskenet ritas för just nu. Det glider mot himlens, så att norrskenet flyttar
	// sig mjukt när tiden vrids över en gräns mellan två treTimmarsperioder.
	let shownKp: number | null = null
	// Molnen: om de visas, och hur långt de har tonat in.
	let clouds = true
	let cloudLevel = 1
	// Och meteorregnen.
	let meteors = true
	let meteorLevel = 1
	// Hur långt övrig text har tonats ner för en framlyft figur.
	let liftLevel = 0
	const levels = new Map<string, Level>()
	const markLevels = new Map<number, number>()
	// Teckningar som hämtats, och de som är på väg, efter figurens id.
	const art = new Map<string, Art>()
	const artRequested = new Set<string>()
	let artIndex: Promise<Record<string, ArtFile>> | null = null

	// Nästa bild för norrskenets rörelse, när ingenting annat rör sig.
	let motion = 0
	// Om nästa bild måste ritas hel. Bilder som bara drivs av norrskenets och meteorernas rörelse
	// återanvänder resten av kartan från förra bilden.
	let full = true
	// Om handen panorerar, zoomar eller vrider kalenderskivan just nu.
	let interacting = false
	// Om blicken följer telefonen. Då styr telefonen riktningen och handen bara zoomen.
	let following = false
	// Tills telefonen legat still en stund ritas kartan glesare, som när handen rör den.
	let settle = 0

	function redraw() {
		full = true
		cancelAnimationFrame(frame)
		frame = requestAnimationFrame(paint)
	}

	function redrawMotion() {
		cancelAnimationFrame(frame)
		frame = requestAnimationFrame(paint)
	}

	function paint(time: number) {
		if (!scene || width === 0 || height === 0) return
		const motionOnly = !full
		full = false
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
		cloudLevel = approach(cloudLevel, clouds ? 1 : 0, 0.5)
		meteorLevel = approach(meteorLevel, meteors ? 1 : 0, 0.5)
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

		shownKp = scene.kp === null ? null : shownKp === null ? scene.kp : approach(shownKp, scene.kp, KP_RATE)
		const sky =
			shownKp !== null && shownKp !== scene.kp ? { ...scene, aurora: auroraAt(shownKp, scene.position) } : scene

		drawScene(canvas, {
			scene: sky,
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
			cloudsShown: cloudLevel,
			meteorsShown: meteorLevel,
			lifted: liftLevel,
			moving: interacting,
		}, motionOnly)
		if ((introStart !== null && (intro < 1 || figureIntro < 1)) || outgoing || settling) redraw()
		// Norrskenet rör sig: medan det syns ritas kartan om ungefär elva gånger i sekunden, vilket
		// räcker för en så långsam rörelse. En meteor som faller ritas varje bildruta, och annars
		// väntar kartan tills nästa ska falla.
		else {
			const wait = Math.min(auroraMoving() ? MOTION_MILLISECONDS : Infinity, meteorsWait())
			window.clearTimeout(motion)
			if (wait < Infinity) motion = window.setTimeout(redrawMotion, wait)
		}
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
		if (!following) view.altitude = Math.max(view.altitude, lowestAltitude(width, height, view.zoom))
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
	// Fingrarna och pekarna som är nere just nu. Kommer ett andra finger är det ett nyp, inte en
	// vridning: då släpps skivan och tiden går tillbaka dit den var.
	const pointers = new Set<number>()
	const onPointerDown = (event: PointerEvent) => {
		pointers.add(event.pointerId)
		if (pointers.size > 1) {
			if (turning) {
				onTurn(turning.from, false)
				turning = null
				interacting = false
			}
			return
		}
		const grip = dialAt(event.clientX, event.clientY)
		if (!grip || !scene || event.button !== 0) return
		canvas.setPointerCapture(event.pointerId)
		interacting = true
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
	const onPointerEnd = (event: PointerEvent) => {
		pointers.delete(event.pointerId)
		if (!turning) return
		onTurn(turning.time, false)
		turning = null
		justTurned = true
		interacting = false
		redraw()
	}
	canvas.addEventListener("pointerdown", onPointerDown)
	canvas.addEventListener("pointermove", onPointerMove)
	canvas.addEventListener("pointerup", onPointerEnd)
	canvas.addEventListener("pointercancel", onPointerEnd)

	// d3-zoom sköter mus, hjul och nyp. Förflyttningen blir en ny blickriktning i stället för
	// en förskjutning av bilden, så horisonten ligger kvar vågrätt.
	let last: ZoomTransform = zoomIdentity
	// Riktningen handen har vridit blicken till. Blicken följer den, utom nära ett väderstreck,
	// där den dras mot det (se `magnetic`).
	let hand = view.azimuth
	const behavior = zoom<HTMLCanvasElement, unknown>()
		.scaleExtent(ZOOM_EXTENT)
		// Som d3-zooms eget filter, men ett tag i kalenderskivan ska vrida den, inte panorera.
		.filter((event: MouseEvent | TouchEvent | WheelEvent) => {
			if (event.type === "wheel") return true
			if ("ctrlKey" in event && event.ctrlKey) return false
			if ("button" in event && event.button) return false
			// Ett nyp zoomar alltid, också när ett finger råkar ligga på skivan.
			if ("touches" in event && event.touches.length > 1) return true
			const point = "touches" in event ? event.touches[0] : event
			return !point || !dialAt(point.clientX, point.clientY)
		})
		.on("zoom", (event: D3ZoomEvent<HTMLCanvasElement, unknown>) => {
			const transform = event.transform
			// Hjul och nyp zoomar bara. d3-zoom flyttar samtidigt bilden så att punkten under
			// fingrarna står still, men här skulle den förflyttningen bli en vriden himmel.
			const source = event.sourceEvent as Event | null
			const pinching = source !== null && "touches" in source && (source as TouchEvent).touches.length > 1
			if (source?.type !== "wheel" && !pinching && !following) {
				const degrees = degreesPerPixel(width, height, transform.k)
				hand = (hand - (transform.x - last.x) * degrees + 360) % 360
				view.azimuth = magnetic(hand)
				view.altitude += (transform.y - last.y) * degrees
			}
			view.zoom = transform.k
			if (!following) {
				view.altitude = Math.min(90, Math.max(lowestAltitude(width, height, view.zoom), view.altitude))
			}
			last = transform
			redraw()
		})
		// Medan handen rör kartan ritas den glesare; när den släpper ritas den skarp igen.
		.on("start", () => {
			interacting = true
		})
		.on("end", () => {
			interacting = false
			redraw()
		})
	const selection = select(canvas)
	selection.call(behavior)
	// Två tryck i följd väljer en stjärnbild och sedan en stjärna i den; de ska inte zooma.
	selection.on("dblclick.zoom", null)

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
		/** Visar eller döljer molnen. */
		setClouds(on: boolean) {
			if (clouds === on) return
			clouds = on
			redraw()
		},
		/**
		 * Blicken följer telefonen: dit den pekar, också under horisonten. Med null släpper den,
		 * och handen tar över där telefonen pekade.
		 */
		follow(direction: Direction | null) {
			if (direction === null) {
				if (!following) return
				following = false
				window.clearTimeout(settle)
				interacting = false
				hand = view.azimuth
				view.altitude = Math.min(90, Math.max(lowestAltitude(width, height, view.zoom), view.altitude))
				redraw()
				return
			}
			following = true
			// Små darrningar ritas inte om.
			const turned = Math.abs(((direction.azimuth - view.azimuth + 540) % 360) - 180)
			if (turned < 0.05 && Math.abs(direction.altitude - view.altitude) < 0.05) return
			view.azimuth = direction.azimuth
			view.altitude = direction.altitude
			interacting = true
			window.clearTimeout(settle)
			settle = window.setTimeout(() => {
				interacting = false
				redraw()
			}, 250)
			redraw()
		},
		/** Visar eller döljer meteorregnen. */
		setMeteors(on: boolean) {
			if (meteors === on) return
			meteors = on
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
			window.clearTimeout(motion)
			window.clearTimeout(settle)
		},
	}
}
