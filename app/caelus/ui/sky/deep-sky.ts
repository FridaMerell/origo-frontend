import type { SkyPoint } from "./types"

// public/caelus/data/deep-sky.json: Messiers galaxer och nebulosor ur OpenNGC (CC-BY-SA 4.0).
// Storleken är i bågminuter och lutningen i grader från norr mot öster; null där den saknas.
export type DeepSkyKind =
	| "spiral"
	| "elliptical"
	| "lenticular"
	| "irregular"
	| "emission"
	| "reflection"
	| "planetary"
	| "remnant"
export type DeepSkyRow = [
	ra: number,
	dec: number,
	magnitude: number,
	major: number,
	minor: number,
	angle: number | null,
	kind: DeepSkyKind,
	designation: string,
	name: string,
]

export const DEEP_SKY_KINDS: Record<DeepSkyKind, string> = {
	spiral: "Spiralgalax",
	elliptical: "Elliptisk galax",
	lenticular: "Linsformad galax",
	irregular: "Irreguljär galax",
	emission: "Emissionsnebulosa",
	reflection: "Reflexionsnebulosa",
	planetary: "Planetarisk nebulosa",
	remnant: "Supernovarest",
}

export function isGalaxy(kind: DeepSkyKind) {
	return kind === "spiral" || kind === "elliptical" || kind === "lenticular" || kind === "irregular"
}

export type DeepSkyObject = {
	// Radnumret i filen.
	index: number
	at: SkyPoint
	// Ändarna av halva storaxeln och halva lillaxeln, på himlen, så att formen kan projiceras med
	// sin verkliga storlek och lutning.
	majorEnd: SkyPoint
	minorEnd: SkyPoint
	magnitude: number
	major: number
	minor: number
	kind: DeepSkyKind
	designation: string
	name: string
}

const RADIAN = Math.PI / 180

// Punkten `distance` grader bort från (ra, dec) i riktningen `bearing`, räknat från norr mot öster.
function offset(ra: number, dec: number, distance: number, bearing: number): [number, number] {
	const d = distance * RADIAN
	const b = bearing * RADIAN
	const phi = dec * RADIAN
	const sinDec = Math.sin(phi) * Math.cos(d) + Math.cos(phi) * Math.sin(d) * Math.cos(b)
	const to = Math.asin(sinDec)
	const turn = Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(phi), Math.cos(d) - Math.sin(phi) * sinDec)
	return [ra + turn / RADIAN, to / RADIAN]
}

/** Objekten på himlen från platsen; de under horisonten kommer inte med. */
export function deepSkyObjects(rows: DeepSkyRow[], toSky: (equatorial: [number, number]) => SkyPoint) {
	const objects: DeepSkyObject[] = []
	rows.forEach(([ra, dec, magnitude, major, minor, angle, kind, designation, name], index) => {
		const at = toSky([ra, dec])
		if (at[1] < -2) return
		const bearing = angle ?? 0
		objects.push({
			index,
			at,
			majorEnd: toSky(offset(ra, dec, major / 120, bearing)),
			minorEnd: toSky(offset(ra, dec, minor / 120, bearing + 90)),
			magnitude,
			major,
			minor,
			kind,
			designation,
			name,
		})
	})
	return objects
}

/**
 * Hur tydligt ett objekt står på kartan (0…1). Utan fokus syns de ljusaste, fler när man zoomar
 * in; med fokus alla.
 */
export function deepSkyShown(magnitude: number, detail: number, focus: number) {
	const limit = Math.min(11, 5 + 3 * Math.log2(Math.max(detail, 0.1)) + 2.5)
	const plain = Math.min(1, Math.max(0, (limit - magnitude) / 1.2))
	return plain + (1 - plain) * focus
}

/** Storleken i ord: bågminuter, eller grader för de största. */
export function deepSkySize(major: number, minor: number) {
	const format = (value: number, decimals: number) => value.toLocaleString("sv-SE", { maximumFractionDigits: decimals })
	if (major >= 60) return major === minor ? `${format(major / 60, 1)}°` : `${format(major / 60, 1)}° × ${format(minor / 60, 1)}°`
	return major === minor ? `${format(major, 1)}′` : `${format(major, 1)}′ × ${format(minor, 1)}′`
}
