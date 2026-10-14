import {
	Body,
	Equator,
	GeoMoon,
	Horizon,
	KM_PER_AU,
	NextLocalSolarEclipse,
	NextLunarEclipse,
	Observer,
	SearchLocalSolarEclipse,
	SearchLunarEclipse,
	SearchMaxElongation,
	SearchMoonPhase,
	SearchRelativeLongitude,
	SearchSunLongitude,
	Seasons,
	SunPosition,
	type AstroTime,
} from "astronomy-engine"
import type { MeteorShower } from "@/app/lib/dal/caelus"
import { showerName, solarLongitude } from "./meteors"
import type { Position } from "./types"

// Något särskilt på himlen: en förmörkelse, ett meteorregns maximum, en ovanlig fullmåne …
export type SkyEvent = {
	// Tidpunkten, i millisekunder; kartan går dit när händelsen väljs.
	time: number
	title: string
	detail: string
	// Vanliga fullmånar står i listan men markeras inte på kalenderskivan, så att det som är
	// ovanligt syns där.
	minor?: boolean
}

// Regnen som är värda att vänta på; de svagaste syns bara på kartan medan de pågår.
const NOTABLE_ZHR = 10
// En fullmåne närmare än så kallas supermåne.
const SUPERMOON_KM = 360_000

const PLANETS = [
	{ body: Body.Mars, name: "Mars" },
	{ body: Body.Jupiter, name: "Jupiter" },
	{ body: Body.Saturn, name: "Saturnus" },
]
const INNER = [
	{ body: Body.Mercury, name: "Merkurius" },
	{ body: Body.Venus, name: "Venus" },
]
const ECLIPSE_KIND: Record<string, string> = {
	penumbral: "Halvskuggförmörkelse",
	partial: "Partiell",
	annular: "Ringformig",
	total: "Total",
}

const at = (time: AstroTime) => time.date.getTime()

// Årets händelser för platsen, i tidsordning.
function eventsOfYear(year: number, position: Position, showers: MeteorShower[]): SkyEvent[] {
	const start = new Date(year, 0, 1)
	const end = new Date(year + 1, 0, 1).getTime()
	const events: SkyEvent[] = []
	const observer = new Observer(position.latitude, position.longitude, 0)

	const seasons = Seasons(year)
	events.push(
		{ time: at(seasons.mar_equinox), title: "Vårdagjämning", detail: "Dag och natt är lika långa" },
		{ time: at(seasons.jun_solstice), title: "Sommarsolstånd", detail: "Årets längsta dag" },
		{ time: at(seasons.sep_equinox), title: "Höstdagjämning", detail: "Dag och natt är lika långa" },
		{ time: at(seasons.dec_solstice), title: "Vintersolstånd", detail: "Årets längsta natt" },
	)

	// Meteorregnens maximum: när solen når regnets longitud. Listan anger den för J2000, och
	// sökningen går på dagens ekvinoktium, så precessionen läggs till.
	for (const shower of showers) {
		if (shower.zhr < NOTABLE_ZHR) continue
		const precession = shower.peak - solarLongitude(start) + SunPosition(start).elon
		const peak = SearchSunLongitude(((precession % 360) + 360) % 360, start, 366)
		if (!peak) continue
		events.push({
			time: at(peak),
			title: `${showerName(shower)}s maximum`,
			detail: `Upp till ${shower.zhr} meteorer i timmen`,
		})
	}

	// Fullmånarna. Den andra i samma kalendermånad är en blå måne.
	let previousMonth = -1
	for (let moon = SearchMoonPhase(180, start, 40); moon && at(moon) < end; moon = SearchMoonPhase(180, moon.AddDays(1), 40)) {
		const month = moon.date.getMonth()
		const distance = GeoMoon(moon).Length() * KM_PER_AU
		const blue = month === previousMonth
		const near = distance < SUPERMOON_KM
		previousMonth = month
		events.push({
			time: at(moon),
			title: blue && near ? "Blå supermåne" : blue ? "Blå måne" : near ? "Supermåne" : "Fullmåne",
			detail: blue
				? "Andra fullmånen i samma månad"
				: near
					? `Månen är nära jorden, ${Math.round(distance / 1000) * 1000} km bort`
					: "",
			minor: !blue && !near,
		})
	}

	for (let eclipse = SearchLunarEclipse(start); at(eclipse.peak) < end; eclipse = NextLunarEclipse(eclipse.peak)) {
		// En förmörkelse när månen är under horisonten syns inte härifrån.
		const moon = Equator(Body.Moon, eclipse.peak, observer, true, true)
		if (Horizon(eclipse.peak, observer, moon.ra, moon.dec).altitude <= 0) continue
		events.push({
			time: at(eclipse.peak),
			title: eclipse.kind === "penumbral" ? "Halvskuggförmörkelse av månen" : `${ECLIPSE_KIND[eclipse.kind]} månförmörkelse`,
			detail: eclipse.kind === "total" ? `Totalitet i ${Math.round(eclipse.sd_total * 2)} minuter` : "",
		})
	}

	// Solförmörkelserna som syns från platsen, med solen uppe.
	for (
		let eclipse = SearchLocalSolarEclipse(start, observer);
		at(eclipse.peak.time) < end;
		eclipse = NextLocalSolarEclipse(eclipse.peak.time, observer)
	) {
		if (eclipse.peak.altitude <= 0) continue
		events.push({
			time: at(eclipse.peak.time),
			title: `${ECLIPSE_KIND[eclipse.kind]} solförmörkelse`,
			detail: `${Math.round(eclipse.obscuration * 100)} % av solen skyms`,
		})
	}

	// Planeterna i opposition: närmast, ljusast och uppe hela natten.
	for (const { body, name } of PLANETS) {
		for (let time = SearchRelativeLongitude(body, 0, start); at(time) < end; time = SearchRelativeLongitude(body, 0, time.AddDays(1))) {
			events.push({ time: at(time), title: `${name} i opposition`, detail: "Uppe hela natten och som ljusast" })
		}
	}

	// Merkurius och Venus syns bäst när de står längst från solen.
	for (const { body, name } of INNER) {
		for (let event = SearchMaxElongation(body, start); at(event.time) < end; event = SearchMaxElongation(body, event.time.AddDays(1))) {
			events.push({
				time: at(event.time),
				title: `${name} längst från solen`,
				detail: `${Math.round(event.elongation)}° från solen, på ${event.visibility === "morning" ? "morgonhimlen" : "kvällshimlen"}`,
			})
		}
	}

	return events.filter(event => event.time < end).sort((a, b) => a.time - b.time)
}

// Ett år räknas ut en gång per plats och lista över meteorregn; platsen avrundas, så att små
// skillnader inte räknar om.
let cache = new Map<string, SkyEvent[]>()
let cachedShowers: MeteorShower[] | null = null

function cachedYear(year: number, position: Position, showers: MeteorShower[]) {
	if (showers !== cachedShowers) {
		cache = new Map()
		cachedShowers = showers
	}
	const key = `${year}:${position.latitude.toFixed(0)}:${position.longitude.toFixed(0)}`
	let events = cache.get(key)
	if (!events) {
		events = eventsOfYear(year, position, showers)
		cache.set(key, events)
	}
	return events
}

/** Händelserna under året kring en tidpunkt, och de första under nästa, i tidsordning. */
export function eventsAround(time: Date, position: Position, showers: MeteorShower[]) {
	const year = time.getFullYear()
	return [...cachedYear(year, position, showers), ...cachedYear(year + 1, position, showers)]
}

/** Dagarna under tidpunktens år (räknat från 0 den 1 januari) då något ovanligt händer. */
export function eventDays(time: Date, position: Position, showers: MeteorShower[]) {
	const year = time.getFullYear()
	const first = new Date(year, 0, 1).getTime()
	return cachedYear(year, position, showers)
		.filter(event => !event.minor)
		.map(event => {
			const date = new Date(event.time)
			return Math.round((new Date(year, date.getMonth(), date.getDate()).getTime() - first) / 86_400_000)
		})
}

/** Om två tidpunkter infaller samma dag, i webbläsarens tidszon. */
export function sameDay(a: number, b: number) {
	return new Date(a).toDateString() === new Date(b).toDateString()
}
