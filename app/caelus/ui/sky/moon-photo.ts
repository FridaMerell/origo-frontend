import { Body, Equator, Horizon, Illumination, MoonPhase, Observer, SearchRiseSet } from "astronomy-engine"
import type { Position } from "./types"

/*
 * Månfoto: när månen går upp och ner de kommande dagarna, var på horisonten, hur mycket som är
 * upplyst och vilket ljus solen ger då. Bäst är en minst halv måne vid horisonten i gyllene
 * eller blå timmen, när både månen och förgrunden syns.
 */

const DAY = 24 * 60 * 60_000
export const PHOTO_DAYS = 30

// Ljuset efter solens höjd, med fotografers vanliga gränser.
export type Light = "day" | "golden" | "blue" | "dark"
const GOLDEN_TOP = 6
const GOLDEN_BOTTOM = -4
const BLUE_BOTTOM = -6

export function lightAt(sunAltitude: number): Light {
	if (sunAltitude > GOLDEN_TOP) return "day"
	if (sunAltitude > GOLDEN_BOTTOM) return "golden"
	if (sunAltitude > BLUE_BOTTOM) return "blue"
	return "dark"
}

export type MoonMoment = {
	kind: "rise" | "set"
	time: number
	// Azimut i grader från norr, och solens azimut och höjd i samma ögonblick.
	azimuth: number
	sunAzimuth: number
	sunAltitude: number
	// Upplyst andel 0…1, och om månen är avtagande (upplyst till vänster sett härifrån).
	lit: number
	waning: boolean
	light: Light
	// Minst halv och vid horisonten i gyllene eller blå timmen.
	good: boolean
}

export type PhotoDay = {
	// Dygnets början, lokal tid.
	start: number
	lit: number
	waning: boolean
	moments: MoonMoment[]
	good: boolean
}

function horizontal(body: Body, observer: Observer, date: Date) {
	const equatorial = Equator(body, date, observer, true, true)
	return Horizon(date, observer, equatorial.ra, equatorial.dec, "normal")
}

function moment(kind: MoonMoment["kind"], date: Date, observer: Observer): MoonMoment {
	const moon = horizontal(Body.Moon, observer, date)
	const sun = horizontal(Body.Sun, observer, date)
	const lit = Illumination(Body.Moon, date).phase_fraction
	const light = lightAt(sun.altitude)
	return {
		kind,
		time: date.getTime(),
		azimuth: moon.azimuth,
		sunAzimuth: sun.azimuth,
		sunAltitude: sun.altitude,
		lit,
		waning: MoonPhase(date) > 180,
		light,
		good: lit >= 0.5 && (light === "golden" || light === "blue"),
	}
}

/** De kommande dygnen från dagens början, med månens upp- och nedgångar. */
export function photoDays(today: Date, position: Position): PhotoDay[] {
	const observer = new Observer(position.latitude, position.longitude, 0)
	const days: PhotoDay[] = []
	for (let index = 0; index < PHOTO_DAYS; index++) {
		const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() + index).getTime()
		const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + index + 1).getTime()
		const moments: MoonMoment[] = []
		for (const [kind, direction] of [["rise", +1], ["set", -1]] as const) {
			const found = SearchRiseSet(Body.Moon, observer, direction, new Date(start), 1)
			if (found && found.date.getTime() < end) moments.push(moment(kind, found.date, observer))
		}
		moments.sort((a, b) => a.time - b.time)
		const noon = new Date(start + DAY / 2)
		days.push({
			start,
			lit: Illumination(Body.Moon, noon).phase_fraction,
			waning: MoonPhase(noon) > 180,
			moments,
			good: moments.some(item => item.good),
		})
	}
	return days
}
