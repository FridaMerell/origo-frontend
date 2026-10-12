import { Body, Equator, Horizon, Illumination, MoonPhase, Observer, SearchRiseSet } from "astronomy-engine"
import type { PanelInfo } from "./InfoPanel"
import type { SkyCulture } from "./sky-cultures"
import { bayerLabel } from "./sky/scene"
import type { Catalogue, Constellation as ConstellationData, Figure, Position, SkyPoint } from "./sky/types"

// En rad i public/caelus/data/star-details.json, i samma ordning som stars.json.
export type StarDetails = [
	hip: number | null,
	hd: number | null,
	lightYears: number | null,
	spectrum: string,
	luminosity: number | null,
	flamsteed: string,
	variable: string,
]

export type SelectedStar = {
	index: number
	name: string
	// Stjärnans vanliga namn, när den valda himlen kallar den något annat.
	alias: string
	letter: string
	magnitude: number
	azimuth: number
	altitude: number
	// Stjärnbilden den ligger i: namnet på vald himmels språk och den latinska genitiven.
	constellation: string
	genitive: string
	// Från en fil som hämtas först när en stjärna öppnas; null tills den är framme.
	details: StarDetails | null
}

const DIRECTIONS = ["norr", "nordost", "öster", "sydost", "söder", "sydväst", "väster", "nordväst"]
const AU_KM = 149_597_870.7
const CLOCK_FORMAT = new Intl.DateTimeFormat("sv-SE", { hour: "2-digit", minute: "2-digit" })
const WEEKDAY_FORMAT = new Intl.DateTimeFormat("sv-SE", { weekday: "short" })

function number(value: number, decimals: number) {
	return value.toLocaleString("sv-SE", { maximumFractionDigits: decimals })
}

// Var något står på himlen just nu, i ord.
function whereNow([azimuth, altitude]: SkyPoint) {
	if (altitude < 0) return "Under horisonten"
	const direction = DIRECTIONS[Math.round(((azimuth + 360) % 360) / 45) % 8]
	return `${Math.round(altitude)}° upp i ${direction}`
}

function starDesignation(star: SelectedStar) {
	if (star.letter) return `${star.letter} ${star.genitive}`.trim()
	if (!star.details) return ""
	const [hip, hd, , , , flamsteed] = star.details
	if (flamsteed) return `${flamsteed} ${star.genitive}`.trim()
	return hip ? `HIP ${hip}` : hd ? `HD ${hd}` : ""
}

export function starInfo(star: SelectedStar): PanelInfo {
	const name = starDesignation(star)
	const [hip, hd, lightYears, spectrum, luminosity, , variable] = star.details ?? []
	const catalogues = [hip ? `HIP ${hip}` : "", hd ? `HD ${hd}` : ""].filter(Boolean).join(" · ")
	return {
		key: `star:${star.index}`,
		label: "Vald stjärna",
		title: star.name || name || "Namnlös stjärna",
		subtitle: [star.alias, star.name ? name : "", star.constellation].filter(Boolean).join(" · "),
		rows: (
			[
				["Magnitud", number(star.magnitude, 2)],
				["Just nu", whereNow([star.azimuth, star.altitude])],
				["Avstånd", lightYears ? `${number(lightYears, lightYears < 100 ? 1 : 0)} ljusår` : ""],
				["Spektralklass", spectrum ?? ""],
				["Ljusstyrka", luminosity ? `${number(luminosity, luminosity < 10 ? 2 : 0)} × solen` : ""],
				["Variabel", variable ?? ""],
				["Katalog", catalogues],
			] as [string, string][]
		).filter(([, value]) => value),
	}
}

/**
 * En stjärnbild: var den står, hur många stjärnor figuren dras mellan och, för IAU:s 88, de
 * ljusaste och de namngivna stjärnorna inom dess gränser.
 */
export function figureInfo(
	figure: Figure,
	culture: SkyCulture,
	catalogue: Catalogue | null,
	constellation: ConstellationData | undefined,
): PanelInfo {
	const vertices = new Set(figure.lines.flat().map(point => point.join(":")))
	const latin = constellation && culture !== "latin" && culture !== "norse" ? constellation.name : ""
	const rows: [string, string][] = [
		["Just nu", whereNow(figure.at)],
		["Stjärnor i figuren", String(vertices.size)],
	]
	if (constellation && catalogue) {
		// Katalogen är sorterad ljusast först.
		const members = catalogue.stars.filter(row => row[5] === constellation.id)
		const brightest = members[0]
		if (brightest) {
			const letter = bayerLabel(brightest[4])
			const name = brightest[6] || (letter ? `${letter} ${constellation.genitive ?? ""}`.trim() : "")
			if (name) rows.push(["Ljusaste stjärna", `${name}, magnitud ${number(brightest[2], 1)}`])
		}
		rows.push(["Synliga för ögat", `${members.length} stjärnor`])
		const named = members.map(row => row[6]).filter(Boolean).slice(0, 5)
		if (named.length > 0) rows.push(["Namngivna", named.join(", ")])
	}
	return {
		key: `figure:${figure.id}`,
		label: "Vald stjärnbild",
		title: figure.name,
		subtitle: [figure.gloss !== figure.name ? figure.gloss : "", latin !== figure.gloss ? latin : ""]
			.filter(Boolean)
			.join(" · "),
		rows,
	}
}

const BODY_KINDS: Partial<Record<Body, string>> = {
	[Body.Sun]: "Stjärna",
	[Body.Moon]: "Jordens måne",
}

function moonPhaseName(angle: number) {
	if (angle < 10 || angle >= 350) return "Nymåne"
	if (angle < 80) return "Tilltagande skära"
	if (angle < 100) return "Första kvarteret"
	if (angle < 170) return "Tilltagande"
	if (angle < 190) return "Fullmåne"
	if (angle < 260) return "Avtagande"
	if (angle < 280) return "Sista kvarteret"
	return "Avtagande skära"
}

// Ett klockslag, med veckodag när det inte är samma dag som kartan visar.
function clock(at: Date, now: Date) {
	const sameDay = at.toDateString() === now.toDateString()
	return sameDay ? CLOCK_FORMAT.format(at) : `${WEEKDAY_FORMAT.format(at)} ${CLOCK_FORMAT.format(at)}`
}

/**
 * Solen, månen eller en planet vid kartans tidpunkt, sedd från platsen: var den står, hur ljus
 * den är, hur långt bort och när den går upp och ner härnäst.
 */
export function bodyInfo(body: Body, name: string, now: Date, position: Position): PanelInfo {
	const observer = new Observer(position.latitude, position.longitude, 0)
	const ofDate = Equator(body, now, observer, true, true)
	const horizontal = Horizon(now, observer, ofDate.ra, ofDate.dec, "normal")
	const light = Illumination(body, now)
	const rise = SearchRiseSet(body, observer, +1, now, 2)
	const set = SearchRiseSet(body, observer, -1, now, 2)

	const distance =
		body === Body.Moon
			? `${number(Math.round(light.geo_dist * AU_KM), 0)} km`
			: `${number(light.geo_dist, 2)} AE · ${number((light.geo_dist * AU_KM) / 1e6, 0)} miljoner km`
	const rows: [string, string][] = [
		["Just nu", whereNow([horizontal.azimuth, horizontal.altitude])],
		["Magnitud", number(light.mag, 1)],
		["Avstånd", distance],
	]
	if (body === Body.Moon) {
		rows.push(["Fas", `${moonPhaseName(MoonPhase(now))}, ${Math.round(light.phase_fraction * 100)} % upplyst`])
	} else if (body === Body.Venus || body === Body.Mercury) {
		rows.push(["Fas", `${Math.round(light.phase_fraction * 100)} % upplyst`])
	}
	// Den händelse som kommer först står först.
	const events: [string, Date][] = []
	if (rise) events.push(["Går upp", rise.date])
	if (set) events.push(["Går ner", set.date])
	events.sort((a, b) => a[1].getTime() - b[1].getTime())
	for (const [term, at] of events) rows.push([term, clock(at, now)])
	if (events.length === 0) rows.push(["Upp och ner", horizontal.altitude > 0 ? "Går inte ner" : "Går inte upp"])

	return {
		key: `body:${body}`,
		label: "Vald himlakropp",
		title: name,
		subtitle: BODY_KINDS[body] ?? "Planet",
		rows,
	}
}
