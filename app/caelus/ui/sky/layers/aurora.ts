import { geoArea } from "d3-geo"
import { AURORA_STEP, type AuroraBand } from "../aurora"
import type { SkyPoint } from "../types"
import { dialShownAt } from "../view"
import { mix, type Pen } from "./pen"

// Banden i sammanhängande bitar runt horisonten.
function runs(bands: AuroraBand[]) {
	const result: AuroraBand[][] = []
	let previous: number | null = null
	for (const band of bands) {
		if (previous === null || band.azimuth - previous > AURORA_STEP) result.push([])
		result[result.length - 1].push(band)
		previous = band.azimuth
	}
	return result
}

/**
 * Var norrsken kan synas vid tidpunktens Kp-index: samma fina skraffering som Vintergatan, i
 * norrskenets färg och utan kontur. Svag i vanliga fall och tydligare med norrskensfokus, då
 * etiketten också står även utzoomat.
 */
export function drawAurora({ context, path, projection, scene, view, aurora: color, paper, family, onScreen, label, spacing, hatch, named, auroraFocus }: Pen) {
	const aurora = scene.aurora
	if (!aurora) return
	// Utzoomad, när kalenderskivan syns, är himlen liten: där blir skrafferingen tydligare och
	// etiketten står kvar, så att det syns hur norrskenet ändras när skivan vrids.
	const dial = dialShownAt(view.zoom)
	const emphasis = Math.max(auroraFocus, dial)

	// Ytan: överkanten framåt och underkanten tillbaka. Fel varv ger hela himlen utom ytan, så
	// då vänds den.
	context.globalAlpha = mix(0.2, 0.4, emphasis)
	for (const run of runs(aurora.bands)) {
		const ring: SkyPoint[] = [
			...run.map(band => [band.azimuth, band.upper] as SkyPoint),
			...[...run].reverse().map(band => [band.azimuth, band.lower] as SkyPoint),
		]
		ring.push(ring[0])
		const polygon = { type: "Polygon" as const, coordinates: [ring] }
		if (geoArea(polygon) > 2 * Math.PI) ring.reverse()
		hatch(color, () => path(polygon))
	}

	// Etiketten står strax ovanför bandets högsta punkt, mot den geomagnetiska polen.
	const lettered = Math.max(named, emphasis)
	if (lettered <= 0.01) return
	const top = aurora.bands.reduce((highest, band) => (band.upper > highest.upper ? band : highest))
	const point = projection([top.azimuth, Math.min(top.upper, 60) + 2] as SkyPoint)
	if (!onScreen(point)) return
	context.globalAlpha = lettered * mix(0.8, 1, auroraFocus)
	context.font = `500 13px ${family}`
	context.textAlign = "center"
	context.textBaseline = "alphabetic"
	context.fillStyle = color
	context.strokeStyle = paper
	context.lineWidth = 3.5
	spacing("0.2em")
	const kp = aurora.kp.toLocaleString("sv-SE", { maximumFractionDigits: 1 })
	label(`NORRSKEN · KP ${kp}`, point[0], point[1], auroraFocus > 0.5)
	spacing("0px")
	context.globalAlpha = 1
}
