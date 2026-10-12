import { geoArea } from "d3-geo"
import { wrap } from "./scene"
import type { SkyPoint } from "./types"

/*
 * Vintergatans kontur från d3-celestial (public/caelus/data/mw.json, BSD-licens): fem nivåer
 * från den svaga ytterkanten till den ljusa kärnan, var och en en polygon med hål där de mörka
 * molnen ligger. Konturen byggs en gång när filen lästs in, som riktningar i rymden; när tiden
 * ändras vrids de bara till den nya himlen.
 */

const DEGREE = Math.PI / 180
// Var tredje punkt i konturen behålls: tätt nog för formen, glest nog för att himlen ska kunna
// vridas medan tiden dras.
const THINNING = 3
// Ringar med färre punkter än så är små fläckar som inte syns på kartan.
const SMALLEST_RING = 12

type Ring = [number, number][]
type MilkyWayFile = {
	features: { geometry: { type: "MultiPolygon"; coordinates: Ring[][] } }[]
}

// En polygon som riktningar i rymden: x, y, z för varje punkt, en lista per ring. `reversed`
// säger om ringarna måste vändas för att gå rätt varv på kartan; det avgörs första gången de
// vrids och gäller sedan alltid, eftersom vridningen inte ändrar varvet.
type Polygon = { rings: Float64Array[]; reversed: boolean | null }
// Nivåerna, den svagaste först.
export type MilkyWayData = Polygon[][]

/** Bygger konturen ur filen. Görs en gång. */
export function prepareMilkyWay(file: MilkyWayFile): MilkyWayData {
	return file.features.map(feature =>
		feature.geometry.coordinates.map(polygon => ({
			rings: polygon
				.filter(ring => ring.length >= SMALLEST_RING)
				.map(ring => {
					const kept = ring.filter((_, index) => index % THINNING === 0)
					kept.push(kept[0])
					const vectors = new Float64Array(kept.length * 3)
					kept.forEach(([ra, dec], index) => {
						const cosDec = Math.cos(dec * DEGREE)
						vectors[index * 3] = cosDec * Math.cos(ra * DEGREE)
						vectors[index * 3 + 1] = cosDec * Math.sin(ra * DEGREE)
						vectors[index * 3 + 2] = Math.sin(dec * DEGREE)
					})
					return vectors
				}),
			reversed: null,
		})),
	)
}

/**
 * Konturen vriden till himlen vid en tidpunkt. `rot` är astronomy-engines rotationsmatris från
 * rektascension och deklination (J2000) till horisonten; ljusbrytningen nära horisonten tas
 * inte med, den syns inte i en skuggning.
 */
export function milkyWay(data: MilkyWayData, rot: number[][]): SkyPoint[][][][] {
	const turn = (vectors: Float64Array) => {
		const points: SkyPoint[] = []
		for (let index = 0; index < vectors.length; index += 3) {
			const x = vectors[index]
			const y = vectors[index + 1]
			const z = vectors[index + 2]
			const north = rot[0][0] * x + rot[1][0] * y + rot[2][0] * z
			const west = rot[0][1] * x + rot[1][1] * y + rot[2][1] * z
			const up = rot[0][2] * x + rot[1][2] * y + rot[2][2] * z
			points.push([wrap((360 - Math.atan2(west, north) / DEGREE) % 360), Math.asin(Math.min(1, Math.max(-1, up))) / DEGREE])
		}
		return points
	}
	return data.map(level =>
		level.map(polygon => {
			const rings = polygon.rings.map(turn)
			polygon.reversed ??= geoArea({ type: "Polygon", coordinates: rings }) > 2 * Math.PI
			return polygon.reversed ? rings.map(ring => ring.reverse()) : rings
		}),
	)
}
