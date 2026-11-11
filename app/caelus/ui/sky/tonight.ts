import {
	Body,
	Equator,
	Horizon,
	HorizonFromVector,
	Illumination,
	MakeTime,
	MoonPhase,
	Observer,
	RotateVector,
	Rotation_EQJ_HOR,
	SearchRiseSet,
	Spherical,
	VectorFromSphere,
} from "astronomy-engine"
import type { MeteorShower } from "@/app/lib/dal/caelus"
import { moonPhaseName } from "../sky-info"
import { auroraAt } from "./aurora"
import { cloudCoverAt, describeCloudCover, type CloudStep } from "./clouds"
import { rateDarkness } from "./darkness"
import { showersAt } from "./meteors"
import { BODIES, wrap } from "./scene"
import type { Position, SkyPoint } from "./types"

/*
 * Natten kring kartans tid, sammanfattad: när den är mörkast och bäst, och vad som syns då.
 * Natten går igenom i steg om en kvart; allt räknas i webbläsaren av data kartan redan har.
 */

const MINUTE = 60_000
const STEP = 15 * MINUTE
const DAY = 24 * 60 * MINUTE
const KP_PERIOD = 3 * 60 * MINUTE
// Natten räknas från att solen går under −6° tills den är över −6° igen.
const DARK = -6
// Utan mörk natt räknas den del där solen står högst så här mycket över sin lägsta höjd.
const DARKEST_MARGIN = 2
// En planet räknas när den når minst så här högt medan det är mörkt.
const PLANET_LEAST = 10

const PLANETS = BODIES.filter(item => item.body !== Body.Sun && item.body !== Body.Moon)

export type KpPeriod = { start: number; kp: number }

export type Tonight = {
	start: number
	end: number
	// Falskt när solen aldrig går under −6°; då är natten dess mörkaste del.
	dark: boolean
	// Den längsta sammanhängande tiden med nattens bästa betyg.
	best: { from: number; to: number; verdict: string }
	// Molnigheten i ord, och när den ändras om den gör det. Null utan prognos för natten.
	clouds: { first: string; last: string; changes: number | null } | null
	moon: {
		phase: string
		lit: number
		rise: number | null
		set: number | null
		// Om månen är uppe ("up") eller nere ("down") hela natten.
		whole: "up" | "down" | null
	}
	planets: { name: string; time: number; at: SkyPoint }[]
	showers: { name: string; time: number; hourly: number }[]
	// Högsta Kp under natten och om norrsken då kan synas härifrån. Null utan Kp för natten.
	aurora: { kp: number; time: number; bearing: number | null; upper: number } | null
}

function horizontal(body: Body, observer: Observer, time: number): SkyPoint {
	const date = new Date(time)
	const equatorial = Equator(body, date, observer, true, true)
	const { azimuth, altitude } = Horizon(date, observer, equatorial.ra, equatorial.dec, "normal")
	return [azimuth, altitude]
}

// Nattens början och slut kring en tidpunkt, i hela steg.
function nightAround(time: number, observer: Observer) {
	const sun = (at: number) => horizontal(Body.Sun, observer, at)[1]
	if (sun(time) < DARK) {
		let start = time
		while (time - start < DAY && sun(start - STEP) < DARK) start -= STEP
		let end = time
		while (end - time < DAY && sun(end + STEP) < DARK) end += STEP
		return { start, end, dark: true }
	}
	let start = time
	while (start - time < DAY && sun(start) >= DARK) start += STEP
	if (start - time < DAY) {
		let end = start
		while (end - start < DAY && sun(end + STEP) < DARK) end += STEP
		return { start, end, dark: true }
	}
	// Solen går aldrig under −6° det närmaste dygnet: natten är tiden kring dess lägsta punkt.
	let lowestAt = time
	for (let at = time; at < time + DAY; at += STEP) if (sun(at) < sun(lowestAt)) lowestAt = at
	const limit = sun(lowestAt) + DARKEST_MARGIN
	let from = lowestAt
	while (lowestAt - from < DAY / 2 && sun(from - STEP) < limit) from -= STEP
	let to = lowestAt
	while (to - lowestAt < DAY / 2 && sun(to + STEP) < limit) to += STEP
	return { start: from, end: to, dark: false }
}

/** Natten som kartans tid ligger i, eller natten som kommer om det är dag. */
export function tonightAt(
	time: Date,
	position: Position,
	cloudSteps: CloudStep[],
	kpPeriods: KpPeriod[],
	meteorShowers: MeteorShower[],
): Tonight {
	const observer = new Observer(position.latitude, position.longitude, 0)
	// Stegen ligger på hela kvartar, så att tiderna blir jämna.
	const { start, end, dark } = nightAround(Math.floor(time.getTime() / STEP) * STEP, observer)
	const times: number[] = []
	for (let at = start; at <= end; at += STEP) times.push(at)

	const samples = times.map(at => {
		const sun = horizontal(Body.Sun, observer, at)[1]
		const moon = horizontal(Body.Moon, observer, at)[1]
		const lit = Illumination(Body.Moon, new Date(at)).phase_fraction
		const cloud = cloudCoverAt(cloudSteps, new Date(at))
		return { at, sun, cloud, ...rateDarkness(sun, moon, lit, cloud) }
	})

	// Bästa betyget, och den längsta sammanhängande tiden med det.
	const bestStep = Math.min(...samples.map(sample => sample.step))
	let best: Tonight["best"] | null = null
	for (let index = 0; index < samples.length; index++) {
		if (samples[index].step !== bestStep) continue
		let last = index
		while (last + 1 < samples.length && samples[last + 1].step === bestStep) last++
		if (!best || samples[last].at - samples[index].at > best.to - best.from) {
			best = { from: samples[index].at, to: samples[last].at, verdict: samples[index].verdict }
		}
		index = last
	}

	// Molnen: orden i början och slutet, och när det sista ordet börjar gälla.
	const clouded = samples.filter(sample => sample.cloud !== null)
	let clouds: Tonight["clouds"] = null
	if (clouded.length > 0) {
		const words = clouded.map(sample => describeCloudCover(sample.cloud as number))
		const first = words[0]
		const last = words[words.length - 1]
		let changes: number | null = null
		if (first !== last) {
			let index = words.length - 1
			while (index > 0 && words[index - 1] === last) index--
			changes = clouded[index].at
		}
		clouds = { first, last, changes }
	}

	// Månen: fas mitt i natten, och när den går upp och ner under natten.
	const middle = new Date((start + end) / 2)
	const span = (end - start) / DAY
	const rise = SearchRiseSet(Body.Moon, observer, +1, MakeTime(new Date(start)), span)
	const set = SearchRiseSet(Body.Moon, observer, -1, MakeTime(new Date(start)), span)
	const moonUp = horizontal(Body.Moon, observer, start)[1] > 0
	const moon: Tonight["moon"] = {
		phase: moonPhaseName(MoonPhase(middle)),
		lit: Illumination(Body.Moon, middle).phase_fraction,
		rise: rise ? rise.date.getTime() : null,
		set: set ? set.date.getTime() : null,
		whole: rise || set ? null : moonUp ? "up" : "down",
	}

	// Planeterna som når över 10° medan det är mörkt, och när var och en står högst.
	const darkTimes = dark ? samples.filter(sample => sample.sun < DARK).map(sample => sample.at) : times
	const planets: Tonight["planets"] = []
	for (const { body, name } of PLANETS) {
		let highest: { time: number; at: SkyPoint } | null = null
		for (const at of darkTimes) {
			const point = horizontal(body, observer, at)
			if (!highest || point[1] > highest.at[1]) highest = { time: at, at: point }
		}
		if (highest && highest.at[1] >= PLANET_LEAST) planets.push({ name, ...highest })
	}
	planets.sort((a, b) => a.time - b.time)

	// Meteorregnen som är aktiva under natten, och när flest syns härifrån.
	const byShower = new Map<string, { name: string; time: number; hourly: number }>()
	for (const sample of samples) {
		const date = MakeTime(new Date(sample.at))
		const toHorizon = Rotation_EQJ_HOR(date, observer)
		const toSky = ([ra, dec]: [number, number]): SkyPoint => {
			const vector = RotateVector(toHorizon, VectorFromSphere(new Spherical(dec, ra, 1), date))
			const point = HorizonFromVector(vector, "normal")
			return [wrap(point.lon), point.lat]
		}
		for (const shower of showersAt(new Date(sample.at), toSky, sample.sun, meteorShowers)) {
			const seen = byShower.get(shower.name)
			if (!seen || shower.hourly > seen.hourly) {
				byShower.set(shower.name, { name: shower.name, time: sample.at, hourly: shower.hourly })
			}
		}
	}
	// Bara regn där minst en meteor i timmen kan ses härifrån någon gång under natten.
	const showers = [...byShower.values()].filter(shower => shower.hourly >= 1).sort((a, b) => a.time - b.time)

	// Norrsken: perioden med högst Kp under natten.
	const periods = kpPeriods.filter(period => period.start < end && period.start + KP_PERIOD > start)
	let aurora: Tonight["aurora"] = null
	if (periods.length > 0) {
		const top = periods.reduce((a, b) => (b.kp > a.kp ? b : a))
		const seen = auroraAt(top.kp, position)
		aurora = {
			kp: top.kp,
			time: Math.max(top.start, start),
			bearing: seen ? seen.bearing : null,
			upper: seen ? Math.max(...seen.bands.map(band => band.upper)) : 0,
		}
	}

	// Det finns alltid minst ett steg, så en bästa tid hittas alltid.
	return { start, end, dark, best: best as Tonight["best"], clouds, moon, planets, showers, aurora }
}
