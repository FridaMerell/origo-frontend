import { geoDistance, geoInterpolate } from "d3-geo"
import type { SkyPoint } from "../types"
import type { Pen } from "./pen"

// Avståndet från kartans kanter till pilen: uppe ligger himmelsvalet, och till höger menyn och
// sökknappen.
const INSET = { top: 64, right: 60, bottom: 40, left: 32 }
const ARROW_LENGTH = 34
const HEAD = 9
// Ringen runt målet när det kommit in i bild.
const RING_RADIUS = 24
// Skillnader mindre än så nämns inte i vägvisningen.
const NEGLIGIBLE_DEGREES = 3

// Hur man ska vrida och luta telefonen: "40° åt höger, 15° upp". Tom när den redan pekar dit.
function directions(at: SkyPoint, azimuth: number, altitude: number) {
	const turn = ((at[0] - azimuth + 540) % 360) - 180
	const tilt = at[1] - altitude
	const parts = []
	if (Math.abs(turn) >= NEGLIGIBLE_DEGREES) parts.push(`${Math.round(Math.abs(turn))}° åt ${turn > 0 ? "höger" : "vänster"}`)
	if (Math.abs(tilt) >= NEGLIGIBLE_DEGREES) parts.push(`${Math.round(Math.abs(tilt))}° ${tilt > 0 ? "upp" : "ned"}`)
	return parts.join(", ")
}

/**
 * Vägen till det som sökts fram, medan blicken följer telefonen. Står målet utanför bild pekar en
 * graverad pil från kartans kant ditåt, med namnet och hur långt man ska vrida; står det i bild
 * ringas det in.
 */
export function drawGuide(pen: Pen) {
	const { guide, context, projection, view, width, height, ink, paper, family, label, spacing } = pen
	if (!guide) return
	const centre: SkyPoint = [view.azimuth, view.altitude]
	const point = projection(guide.at)
	const inside =
		point !== null &&
		point[0] > INSET.left &&
		point[0] < width - INSET.right &&
		point[1] > INSET.top &&
		point[1] < height - INSET.bottom

	context.globalAlpha = 1
	context.lineCap = "round"
	context.font = `italic 17px ${family}`
	context.textBaseline = "alphabetic"
	spacing("0px")
	const below = guide.at[1] <= 0 ? " · under horisonten" : ""

	if (inside) {
		const [x, y] = point
		context.strokeStyle = paper
		context.lineWidth = 4
		context.beginPath()
		context.arc(x, y, RING_RADIUS, 0, Math.PI * 2)
		context.stroke()
		context.strokeStyle = ink
		context.lineWidth = 1.2
		context.beginPath()
		context.arc(x, y, RING_RADIUS, 0, Math.PI * 2)
		context.stroke()
		context.fillStyle = ink
		context.strokeStyle = paper
		context.lineWidth = 3.5
		context.textAlign = "center"
		label(`${guide.name}${below}`, x, y + RING_RADIUS + 20, true)
		return
	}

	// Riktningen på kartan: mot en punkt en liten bit längs storcirkeln från blicken mot målet.
	const distance = geoDistance(centre, guide.at)
	const step = projection(geoInterpolate(centre, guide.at)(Math.min(1, 0.05 / Math.max(distance, 0.05))))
	const middle: [number, number] = [width / 2, height / 2]
	const angle = step ? Math.atan2(step[1] - middle[1], step[0] - middle[0]) : 0
	const [dx, dy] = [Math.cos(angle), Math.sin(angle)]
	// Där strålen från mitten mot målet når kanten, innanför marginalerna.
	const reach = Math.min(
		dx > 0 ? (width - INSET.right - middle[0]) / dx : dx < 0 ? (INSET.left - middle[0]) / dx : Infinity,
		dy > 0 ? (height - INSET.bottom - middle[1]) / dy : dy < 0 ? (INSET.top - middle[1]) / dy : Infinity,
	)
	const tip: [number, number] = [middle[0] + dx * reach, middle[1] + dy * reach]
	const tail: [number, number] = [tip[0] - dx * ARROW_LENGTH, tip[1] - dy * ARROW_LENGTH]
	const head = (side: number): [number, number] => [
		tip[0] - HEAD * Math.cos(angle + side * 0.45),
		tip[1] - HEAD * Math.sin(angle + side * 0.45),
	]
	const arrow = () => {
		context.beginPath()
		context.moveTo(...tail)
		context.lineTo(...tip)
		context.moveTo(...head(-1))
		context.lineTo(...tip)
		context.lineTo(...head(1))
		context.stroke()
	}
	context.lineJoin = "round"
	context.strokeStyle = paper
	context.lineWidth = 5
	arrow()
	context.strokeStyle = ink
	context.lineWidth = 1.4
	arrow()

	// Texten står innanför pilens bakre ände, inåt kartan, och hålls inom kanterna.
	const way = directions(guide.at, view.azimuth, view.altitude)
	const lines = [guide.name, `${way}${below}`.replace(/^ · /, "")].filter(Boolean)
	const anchorX = tail[0] - dx * 12
	const anchorY = tail[1] - dy * 12
	context.textAlign = "center"
	const widest = Math.max(...lines.map(line => context.measureText(line).width))
	// Pekar pilen mest åt sidan står texten under den, intill samma kant, så att den inte hamnar
	// mitt på horisontens väderstreck; annars under eller över pilens bakre ände.
	const sideways = Math.abs(dx) > 0.7
	const wantedX = sideways ? (dx < 0 ? INSET.left - 8 + widest / 2 : width - INSET.right + 8 - widest / 2) : anchorX
	const x = Math.min(width - 12 - widest / 2, Math.max(12 + widest / 2, wantedX))
	const top = sideways
		? Math.max(tip[1], tail[1]) + 24
		: dy < 0
			? anchorY + 18
			: anchorY - 6 - 20 * (lines.length - 1)
	context.fillStyle = ink
	context.strokeStyle = paper
	context.lineWidth = 3.5
	lines.forEach((line, index) => label(line, x, top + index * 20, true))
}
