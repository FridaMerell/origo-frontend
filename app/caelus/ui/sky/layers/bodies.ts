import { Body } from "astronomy-engine"
import { geoInterpolate } from "d3-geo"
import type { SkyPoint } from "../types"
import { mix, type Pen } from "./pen"

/**
 * Månens upplysta del: en halv skiva mot solen, avgränsad av terminatorn, en halv ellips vars
 * bredd följer hur stor del som är upplyst. Under hälften blir det en skära, över hälften en
 * tilltagande eller avtagande fullmåne.
 */
function drawMoonLight(
	{ context, projection, ink, scene }: Pen,
	x: number,
	y: number,
	radius: number,
	at: SkyPoint,
	lit: number,
) {
	if (lit < 0.01) return
	// Riktningen mot solen på kartan: en punkt en bit längs storcirkeln från månen mot solen.
	const toward = projection(geoInterpolate(at, scene.sunAt)(0.02))
	const angle = toward ? Math.atan2(toward[1] - y, toward[0] - x) : 0
	const terminator = radius * Math.abs(1 - 2 * lit)
	context.save()
	context.translate(x, y)
	context.rotate(angle)
	context.fillStyle = ink
	context.beginPath()
	// Den upplysta kanten, vänd mot solen.
	context.arc(0, 0, radius, -Math.PI / 2, Math.PI / 2)
	// Terminatorn tillbaka upp: mot solen för en skära, bort från den när mer än hälften lyser.
	context.ellipse(0, 0, Math.max(terminator, 0.01), radius, 0, Math.PI / 2, -Math.PI / 2, lit < 0.5)
	context.fill()
	context.restore()
}

/**
 * Solen, månen och planeterna som är uppe, graverade som resten av kartan: en tunn ring med en
 * prick i, och för solen en andra ring utanför. Runt varje symbol lämnas en smal luftspalt i
 * papprets färg, som när en symbol friläggs på en tryckt atlas, så att den står fri från linjer
 * och stjärnor bakom. Med planetfokus blir de något större och har namn även utzoomat.
 */
export function drawBodies(pen: Pen) {
	const { context, projection, scene, ink, paper, family, onScreen, label, spacing, named, planetFocus } = pen
	const scale = mix(1, 1.25, planetFocus)
	// Namnen följer kartans övriga namn, utom med planetfokus, då de alltid står.
	const lettered = Math.max(named, planetFocus)
	context.globalAlpha = 1
	context.font = `500 15px ${family}`
	context.textAlign = "left"
	context.textBaseline = "alphabetic"
	spacing("0.14em")
	for (const { body, name, at, lit } of scene.bodies) {
		const point = projection(at)
		if (!onScreen(point)) continue
		const [x, y] = point
		const sun = body === Body.Sun
		const radius = (sun || body === Body.Moon ? 9 : 6) * scale
		const outer = sun ? radius + 3.5 * scale : radius
		// Luftspalten.
		context.fillStyle = paper
		context.beginPath()
		context.arc(x, y, outer + 3, 0, Math.PI * 2)
		context.fill()
		context.strokeStyle = ink
		context.lineWidth = 1
		context.beginPath()
		context.arc(x, y, radius, 0, Math.PI * 2)
		if (sun) {
			context.moveTo(x + outer, y)
			context.arc(x, y, outer, 0, Math.PI * 2)
		}
		context.stroke()
		if (body === Body.Moon) {
			drawMoonLight(pen, x, y, radius, at, lit ?? 0)
		} else {
			context.fillStyle = ink
			context.beginPath()
			context.arc(x, y, 1.8 * scale, 0, Math.PI * 2)
			context.fill()
		}
		if (lettered <= 0.01) continue
		context.fillStyle = ink
		context.strokeStyle = paper
		context.lineWidth = 3.5
		context.globalAlpha = lettered
		label(name.toUpperCase(), x + outer + 6, y + 5, planetFocus > 0.5)
		context.globalAlpha = 1
	}
	spacing("0px")
}
