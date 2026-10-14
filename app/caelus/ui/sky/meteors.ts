import { SunPosition } from "astronomy-engine"
import type { MeteorShower } from "@/app/lib/dal/caelus"
import type { SkyPoint } from "./types"

// Regnens svenska namn, efter IAU:s kod; övriga står med IAU:s namn.
const SWEDISH: Record<string, string> = {
	QUA: "Kvadrantiderna",
	LYR: "Lyriderna",
	ETA: "Eta Akvariderna",
	CAP: "Alfa Capricorniderna",
	SDA: "Södra delta Akvariderna",
	PER: "Perseiderna",
	DRA: "Draconiderna",
	STA: "Södra Tauriderna",
	ORI: "Orioniderna",
	NTA: "Norra Tauriderna",
	LEO: "Leoniderna",
	GEM: "Geminiderna",
	URS: "Ursiderna",
}

// Under den här solhöjden är himlen mörk nog för meteorer.
const DARK = -6
// Hur många dygn solen behöver för en grad längs ekliptikan, i medel.
const DAYS_PER_DEGREE = 365.2422 / 360
// Utan uppgift om aktiviteten räknas den till så många grader på var sida om maximum.
const DEFAULT_REACH = 10

export function showerName(shower: MeteorShower) {
	return SWEDISH[shower.code] ?? shower.name
}

// Vinkelskillnad i −180…180.
function wrap(degrees: number) {
	return ((((degrees + 180) % 360) + 360) % 360) - 180
}

/**
 * Solens longitud (J2000, grader) vid tidpunkten, som IAU:s listor anger regnen i. Astronomy
 * Engine ger den för dagens ekvinoktium; precessionen sedan år 2000 dras av.
 */
export function solarLongitude(time: Date) {
	const centuries = (time.getTime() - Date.UTC(2000, 0, 1, 12)) / (36525 * 86_400_000)
	return SunPosition(time).elon - 1.3969713 * centuries
}

export type Shower = {
	name: string
	// Radianten, där meteorerna tycks komma ifrån.
	at: SkyPoint
	// ZHR just nu: hur många meteorer i timmen en mörk himmel med radianten i zenit skulle ge.
	zhr: number
	// Hur många i timmen som kan ses härifrån just nu, med radiantens höjd och himlens mörker.
	hourly: number
	speed: number
}

/** Meteorregnen som är aktiva vid tidpunkten, med radianten på himlen. */
export function showersAt(
	now: Date,
	toSky: (equatorial: [number, number]) => SkyPoint,
	sunAltitude: number,
	data: MeteorShower[],
) {
	const longitude = solarLongitude(now)
	const showers: Shower[] = []
	for (const shower of data) {
		// Grader av solens longitud från maximum; negativt före.
		const degrees = wrap(longitude - shower.peak)
		const before = shower.start === null ? DEFAULT_REACH : wrap(shower.peak - shower.start)
		const after = shower.end === null ? DEFAULT_REACH : wrap(shower.end - shower.peak)
		if (degrees < -before || degrees > after) continue
		// Aktiviteten faller av exponentiellt från maximum, brantare på den kortare sidan.
		const days = degrees * DAYS_PER_DEGREE
		const zhr = shower.zhr * Math.exp(-Math.abs(days) / (((degrees < 0 ? before : after) * DAYS_PER_DEGREE) / 5))
		const at = toSky([
			(shower.ra + shower.ra_drift * degrees + 360) % 360,
			shower.dec + shower.dec_drift * degrees,
		])
		const height = Math.sin((at[1] * Math.PI) / 180)
		const hourly = sunAltitude < DARK && height > 0 ? zhr * height : 0
		showers.push({ name: showerName(shower), at, zhr, hourly, speed: shower.speed })
	}
	return showers
}
