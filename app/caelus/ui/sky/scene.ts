import {
	Body,
	Constellation as constellationAt,
	Equator,
	EquatorFromVector,
	Horizon,
	HorizonFromVector,
	Illumination,
	MakeTime,
	Observer,
	RotateVector,
	Rotation_EQJ_HOR,
	Rotation_HOR_EQJ,
	Spherical,
	VectorFromHorizon,
	VectorFromSphere,
} from "astronomy-engine"
import { geoGraticule } from "d3-geo"
import { NORSE_NAMES, NORSE_STAR_NAMES, SWEDISH_NAMES, type SkyCulture } from "../sky-cultures"
import { auroraAt } from "./aurora"
import { milkyWay, type MilkyWayData } from "./milky-way"
import type { Catalogue, Constellation, Dial, Position, Scene, SceneStar, SkyPoint } from "./types"

// HYG:s förkortningar för Bayers bokstäver.
const GREEK: Record<string, string> = {
	Alp: "α", Bet: "β", Gam: "γ", Del: "δ", Eps: "ε", Zet: "ζ", Eta: "η", The: "θ",
	Iot: "ι", Kap: "κ", Lam: "λ", Mu: "μ", Nu: "ν", Xi: "ξ", Omi: "ο", Pi: "π",
	Rho: "ρ", Sig: "σ", Tau: "τ", Ups: "υ", Phi: "φ", Chi: "χ", Psi: "ψ", Ome: "ω",
}
const SUPERSCRIPT = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"]

export const BODIES = [
	{ body: Body.Sun, name: "Solen" },
	{ body: Body.Moon, name: "Månen" },
	{ body: Body.Mercury, name: "Merkurius" },
	{ body: Body.Venus, name: "Venus" },
	{ body: Body.Mars, name: "Mars" },
	{ body: Body.Jupiter, name: "Jupiter" },
	{ body: Body.Saturn, name: "Saturnus" },
]

// Himlens gradnät: deklinationscirklar var 20:e grad och timcirklar varannan timme.
const EQUATORIAL_GRID = geoGraticule().step([30, 20]).precision(5)().coordinates as [number, number][][]

export function wrap(azimuth: number) {
	return azimuth > 180 ? azimuth - 360 : azimuth
}

export function bayerLabel(bayer: string) {
	const [letter, index] = bayer.split("-")
	const greek = GREEK[letter]
	if (!greek) return ""
	return greek + (index ? [...index].map(digit => SUPERSCRIPT[Number(digit)] ?? "").join("") : "")
}

// Vad en stjärnbild heter på den valda himlen, och vad den heter annars.
function figureNames(constellation: Constellation, culture: SkyCulture) {
	if (culture === "norse") return NORSE_NAMES[constellation.id] ?? { name: constellation.name, gloss: "" }
	const swedish = SWEDISH_NAMES[constellation.id] ?? constellation.name
	if (culture === "greek") return { name: constellation.greek ?? constellation.name, gloss: swedish }
	return culture === "swedish"
		? { name: swedish, gloss: constellation.name }
		: { name: constellation.name, gloss: swedish }
}

// Årets dagar ändras inte under året, så de räknas ut en gång.
let cachedDays: { year: number; days: Dial["days"] } | null = null

// Kalenderskivan visar klockans tid och dag, i webbläsarens tidszon.
function buildDial(now: Date): Dial {
	const year = now.getFullYear()
	if (cachedDays?.year !== year) {
		const days = []
		for (const date = new Date(year, 0, 1); date.getFullYear() === year; date.setDate(date.getDate() + 1)) {
			days.push({ month: date.getMonth(), day: date.getDate() })
		}
		cachedDays = { year, days }
	}
	const { days } = cachedDays
	return {
		time: now.getTime(),
		hours: now.getHours() + now.getMinutes() / 60,
		days,
		today: days.findIndex(day => day.month === now.getMonth() && day.day === now.getDate()),
	}
}

/**
 * Himlen från en plats vid en tidpunkt. Utan katalog blir det horisont, gradnät och planeter,
 * så att de kan ritas medan filerna hämtas. Hela katalogen räknas om på några millisekunder.
 */
export function buildScene(
	now: Date,
	position: Position,
	culture: SkyCulture,
	catalogue: Catalogue | null,
	// Kp-index vid tidpunkten, om det finns uppmätt eller i prognosen.
	kp: number | null,
	// Vintergatans kontur; null tills den hämtats.
	milkyWayData: MilkyWayData | null,
): Scene {
	const time = MakeTime(now)
	const observer = new Observer(position.latitude, position.longitude, 0)
	const toHorizon = Rotation_EQJ_HOR(time, observer)
	const toEquator = Rotation_HOR_EQJ(time, observer)
	const toSky = ([ra, dec]: [number, number]): SkyPoint => {
		const vector = RotateVector(toHorizon, VectorFromSphere(new Spherical(dec, ra, 1), time))
		const horizontal = HorizonFromVector(vector, "normal")
		return [wrap(horizontal.lon), horizontal.lat]
	}
	// Vintergatan vrids till tidpunktens himmel först när den ska ritas.
	let milkyWayShown: SkyPoint[][][][] | null = null

	// Den nordiska himlen har egna namn på några stjärnor; de känns igen på sina koordinater.
	const norseStars = new Map(
		culture === "norse"
			? (catalogue?.norse.stars ?? []).map(star => [star.at.join(":"), NORSE_STAR_NAMES[star.name] ?? ""])
			: [],
	)
	const stars: SceneStar[] = []
	const starByIndex = new Map<number, SceneStar>()
	for (const [index, [ra, dec, magnitude, , bayer, constellation, name]] of (catalogue?.stars ?? []).entries()) {
		const at = toSky([ra, dec])
		if (at[1] < -1) continue
		const norseName = norseStars.get(`${ra}:${dec}`)
		const star = {
			index,
			constellation,
			at,
			magnitude,
			name: norseName ?? (magnitude < 1.5 ? name : ""),
			letter: bayerLabel(bayer),
			fresh: norseName !== undefined,
		}
		stars.push(star)
		starByIndex.set(index, star)
	}

	const bodies: Scene["bodies"] = []
	let sunAt: SkyPoint = [0, -90]
	for (const { body, name } of BODIES) {
		const equatorial = Equator(body, now, observer, true, true)
		const horizontal = Horizon(now, observer, equatorial.ra, equatorial.dec, "normal")
		const at: SkyPoint = [wrap(horizontal.azimuth), horizontal.altitude]
		if (body === Body.Sun) sunAt = at
		if (horizontal.altitude <= 0) continue
		// Månen ritas med den del som är upplyst.
		const lit = body === Body.Moon ? Illumination(body, now).phase_fraction : undefined
		bodies.push({ body, name, at, lit })
	}
	const sunAltitude = sunAt[1]

	const constellations =
		culture === "norse" ? (catalogue?.norse.constellations ?? []) : (catalogue?.constellations ?? [])
	return {
		dial: buildDial(now),
		stars,
		starByIndex,
		figures: constellations.map(constellation => ({
			id: constellation.id,
			...figureNames(constellation, culture),
			rank: constellation.rank,
			at: toSky(constellation.at),
			lines: constellation.lines.map(line => line.map(toSky)),
		})),
		graticule: EQUATORIAL_GRID.map(line => line.map(toSky)),
		bodies,
		sunAt,
		sunAltitude,
		aurora: kp === null ? null : auroraAt(kp, position),
		milkyWay: () => (milkyWayShown ??= milkyWayData ? milkyWay(milkyWayData, toHorizon.rot) : []),
		toSky,
		figureAt:
			culture === "norse"
				? null
				: ([azimuth, altitude]) => {
						const horizontal = new Spherical(altitude, (azimuth + 360) % 360, 1)
						const equatorial = EquatorFromVector(
							RotateVector(toEquator, VectorFromHorizon(horizontal, time, "normal")),
						)
						return constellationAt(equatorial.ra, equatorial.dec).symbol
					},
	}
}
