import type { SkyPoint } from "../types"
import type { Pen } from "./pen"

// Radiantens märke: korta strålar ut från en tom mitt.
const RAYS = 8
const RAY_FROM = 4
const RAY_TO = 9
// Meteorerna visas tätare än de faller, men i proportion: med i medel 12 / √(i timmen) sekunder
// mellan dem kommer det en varannan sekund vid Geminidernas maximum och en på tio vid ett svagt regn.
const INTERVAL = 12_000
// Hur länge ett spår dröjer kvar efter att meteoren slocknat.
const AFTERGLOW = 0.4
// Spåret ritas i bitar som blir tätare och bredare mot huvudet.
const PIECES = 10

type Streak = {
	shower: string
	// Riktningen ut från radianten (radianer), var spåret börjar och hur långt det går (grader).
	bearing: number
	from: number
	length: number
	start: number
	duration: number
}

let streaks: Streak[] = []
// När nästa meteor ur varje regn ska falla.
const nextAt = new Map<string, number>()

/** Millisekunder tills kartan behöver ritas om för meteorerna; oändligt när inga faller. */
export function meteorsWait() {
	if (streaks.length > 0) return 16
	let soonest = Infinity
	for (const time of nextAt.values()) soonest = Math.min(soonest, time)
	return Math.max(16, soonest - performance.now())
}

// Punkten en vinkel bort från en annan på himlen, i en riktning.
function travel([azimuth, altitude]: SkyPoint, bearing: number, distance: number): SkyPoint {
	const radians = Math.PI / 180
	const lat = altitude * radians
	const angle = distance * radians
	const to = Math.asin(Math.sin(lat) * Math.cos(angle) + Math.cos(lat) * Math.sin(angle) * Math.cos(bearing))
	const lon =
		azimuth * radians +
		Math.atan2(Math.sin(bearing) * Math.sin(angle) * Math.cos(lat), Math.cos(angle) - Math.sin(lat) * Math.sin(to))
	return [lon / radians, to / radians]
}

/**
 * De aktiva meteorregnen: radianten graverad som korta strålar med regnets namn, och meteorer som
 * skjuter ut från den i rader av tunna streck, lika ofta som regnet ger just nu.
 */
export function drawMeteors(pen: Pen) {
	const { context, projection, scene, ink, paper, family, onScreen, label, spacing, named, meteorsShown } = pen
	const time = performance.now()
	const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches
	if (meteorsShown < 0.01 || still) {
		streaks = []
		nextAt.clear()
	}
	if (meteorsShown < 0.01) return

	const active = new Set<string>()
	context.lineCap = "round"
	for (const shower of scene.showers) {
		if (!still && shower.hourly > 0) {
			active.add(shower.name)
			const next = nextAt.get(shower.name)
			// Meteorerna faller där de syns: ett spår som skulle gå under horisonten lottas om.
			for (let attempt = 0; next !== undefined && time >= next && attempt < 8; attempt++) {
				const from = 6 + Math.random() * 45
				const length = 8 + from * 0.4
				const bearing = Math.random() * Math.PI * 2
				if (travel(shower.at, bearing, from + length)[1] < 3) continue
				streaks.push({
					shower: shower.name,
					bearing,
					from,
					length,
					start: time,
					duration: 300 + 12_000 / shower.speed,
				})
				break
			}
			if (next === undefined || time >= next) {
				const mean = INTERVAL / Math.sqrt(shower.hourly)
				nextAt.set(shower.name, time + Math.max(300, -Math.log(1 - Math.random()) * mean))
			}
		}

		if (shower.at[1] < -2) continue
		const point = projection(shower.at)
		if (!onScreen(point)) continue
		const [x, y] = point
		context.globalAlpha = meteorsShown * Math.min(1, 0.45 + shower.zhr / 40)
		context.strokeStyle = ink
		context.lineWidth = 0.9
		context.beginPath()
		for (let ray = 0; ray < RAYS; ray++) {
			const angle = (ray / RAYS) * Math.PI * 2
			context.moveTo(x + Math.cos(angle) * RAY_FROM, y + Math.sin(angle) * RAY_FROM)
			context.lineTo(x + Math.cos(angle) * RAY_TO, y + Math.sin(angle) * RAY_TO)
		}
		context.stroke()
		if (named <= 0.01) continue
		context.font = `500 15px ${family}`
		context.textAlign = "left"
		context.textBaseline = "alphabetic"
		context.fillStyle = ink
		context.strokeStyle = paper
		context.lineWidth = 3.5
		context.globalAlpha = named * meteorsShown
		spacing("0.14em")
		label(shower.name.toUpperCase(), x + RAY_TO + 6, y + 5)
		spacing("0px")
	}
	for (const name of nextAt.keys()) if (!active.has(name)) nextAt.delete(name)

	// Varje meteor går ut från radianten och slocknar; spåret hinner ifatt huvudet medan det tonar.
	streaks = streaks.filter(streak => {
		const shower = scene.showers.find(item => item.name === streak.shower)
		const progress = (time - streak.start) / streak.duration
		if (!shower || progress > 1 + AFTERGLOW) return false
		const fade = progress > 1 ? 1 - (progress - 1) / AFTERGLOW : 1
		const head = streak.from + streak.length * Math.min(1, progress)
		const tail = Math.max(streak.from, head - streak.length * 0.6 * fade)
		let previous = projection(travel(shower.at, streak.bearing, tail))
		for (let piece = 1; piece <= PIECES; piece++) {
			const share = piece / PIECES
			const point = projection(travel(shower.at, streak.bearing, tail + (head - tail) * share))
			if (previous && point) {
				context.globalAlpha = meteorsShown * fade * share
				context.lineWidth = 0.3 + 1.1 * share
				context.strokeStyle = ink
				context.beginPath()
				context.moveTo(previous[0], previous[1])
				context.lineTo(point[0], point[1])
				context.stroke()
			}
			previous = point
		}
		return true
	})
	context.globalAlpha = 1
}
