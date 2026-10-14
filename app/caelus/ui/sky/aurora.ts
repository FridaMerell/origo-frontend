import type { Position } from "./types"

/*
 * En enkel modell för var norrsken kan synas vid ett visst Kp-index. Norrskensovalens södra
 * gräns ligger ungefär vid 66,5° geomagnetisk latitud vid Kp 0 och flyttas drygt 2° söderut för
 * varje steg (NOAA:s tabell över Kp och latitud). Norrskenet lyser mellan ungefär 110 och 200 km
 * höjd; hur högt upp på himlen det syns beror på hur långt bort ovalen ligger.
 */

const RADIAN = Math.PI / 180
const EARTH_RADIUS = 6371
// Den geomagnetiska nordpolen (dipolen enligt IGRF 2025).
const POLE = { latitude: 80.8, longitude: -72.8 }
// Kp-tabellen räknar i korrigerade geomagnetiska koordinater, som i Skandinavien ligger ungefär
// två grader söder om dipolens; Uppsala hamnar då på 56,5°, som Uppsalas magnetometer.
const CORRECTION = 2
const BOUNDARY_AT_KP0 = 66.5
const BOUNDARY_PER_KP = 2.05
// Norrskenets nedre och övre kant, i km.
const LOWER_HEIGHT = 110
const UPPER_HEIGHT = 200
// Var hur många grader i azimut höjden räknas ut; också avståndet mellan skrafferingens streck.
export const AURORA_STEP = 1

// En riktning där norrsken kan synas: azimut, och mellan vilka höjder (grader) på himlen. Bågen
// är ovalens närmaste kant, där norrskenet står högst och tydligast: från ridåns nedre kant
// (`arc`) upp till dess övre (`upper`). Längre bort syns resten av ovalen lägre, ner mot `lower`.
export type AuroraBand = { azimuth: number; lower: number; arc: number; upper: number }
export type Aurora = {
	kp: number
	// Riktningen mot den geomagnetiska polen, där norrskenet står högst.
	bearing: number
	// Magnetiska zenit: punkten på himlen dit fältlinjerna och därmed norrskenets strålar pekar
	// uppåt, sedd från platsen [azimut, höjd]. Alla strålar strålar ihop mot den i perspektiv.
	zenith: [number, number]
	bands: AuroraBand[]
}

// Höjden på himlen för något på en viss höjd över marken, en viss vinkel bort längs jordytan.
function elevation(angle: number, height: number) {
	return Math.atan2(Math.cos(angle) - EARTH_RADIUS / (EARTH_RADIUS + height), Math.sin(angle)) / RADIAN
}

/** Var norrsken kan synas från en plats vid ett Kp-värde. Null om det inte syns alls därifrån. */
export function auroraAt(kp: number, { latitude, longitude }: Position): Aurora | null {
	const lat = latitude * RADIAN
	const lon = longitude * RADIAN
	const poleLat = POLE.latitude * RADIAN
	const poleLon = POLE.longitude * RADIAN
	// Platsens geomagnetiska latitud, och riktningen mot polen.
	const dipole = Math.asin(
		Math.sin(lat) * Math.sin(poleLat) + Math.cos(lat) * Math.cos(poleLat) * Math.cos(lon - poleLon),
	)
	const magnetic = dipole - CORRECTION * RADIAN
	const bearing =
		(Math.atan2(
			Math.sin(poleLon - lon) * Math.cos(poleLat),
			Math.cos(lat) * Math.sin(poleLat) - Math.sin(lat) * Math.cos(poleLat) * Math.cos(poleLon - lon),
		) /
			RADIAN +
			360) %
		360
	const boundary = Math.sin((BOUNDARY_AT_KP0 - BOUNDARY_PER_KP * kp) * RADIAN)

	const bands: AuroraBand[] = []
	for (let azimuth = -180; azimuth < 180; azimuth += AURORA_STEP) {
		// Längs en riktning är den geomagnetiska latitudens sinus M·cos(vinkel − δ); ovalen nås
		// där den blir minst lika stor som gränsens.
		const toward = (azimuth - bearing) * RADIAN
		const a = Math.sin(magnetic)
		const b = Math.cos(magnetic) * Math.cos(toward)
		const reach = Math.hypot(a, b)
		if (boundary > reach) continue
		const middle = Math.atan2(b, a)
		const spread = Math.acos(boundary / reach)
		const near = Math.max(0, middle - spread)
		const far = middle + spread
		if (far < 0) continue
		// Närmast står norrskenets övre kant högst; längst bort står dess nedre kant lägst.
		const upper = near === 0 ? 90 : elevation(near, UPPER_HEIGHT)
		const lower = Math.max(0, elevation(far, LOWER_HEIGHT))
		// Står platsen under ovalen finns ingen kant att se på avstånd: norrskenet kan stå över
		// hela himlen.
		const arc = near === 0 ? lower : Math.max(lower, elevation(near, LOWER_HEIGHT))
		if (upper > lower) bands.push({ azimuth, lower, arc, upper })
	}
	// Fältets lutning mot marken i en dipol, och åt vilket håll det pekar uppåt: bort från polen.
	const inclination = Math.atan(2 * Math.tan(dipole)) / RADIAN
	const away = (bearing + 180) % 360
	const zenith: [number, number] = [away > 180 ? away - 360 : away, inclination]
	return bands.length > 0 ? { kp, bearing, zenith, bands } : null
}
