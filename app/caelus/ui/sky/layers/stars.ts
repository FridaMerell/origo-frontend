import type { SceneStar } from "../types"
import { ease } from "../view"
import type { Pen } from "./pen"

// En stjärna som ska ha namn eller bokstav, och var den hamnade på kartan.
export type LabelledStar = { star: SceneStar; point: [number, number] }

// Stjärntecken i storleksklasser som i en atlas teckenförklaring: åtta, sex och fem uddar för
// de tre ljusaste klasserna, sedan punkter.
export function drawStar(
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	magnitude: number,
	scale: number,
) {
	context.beginPath()
	if (magnitude >= 3.2) {
		context.arc(x, y, Math.max(0.55, (5.8 - magnitude) * 0.55) * scale, 0, Math.PI * 2)
		context.fill()
		return
	}
	const points = magnitude < 1.5 ? 8 : magnitude < 2.4 ? 6 : 5
	const outer = (magnitude < 1.5 ? 8.5 - magnitude : magnitude < 2.4 ? 6 : 4.6) * scale
	const inner = outer * 0.42
	for (let index = 0; index < points * 2; index++) {
		const angle = (index * Math.PI) / points - Math.PI / 2
		const length = index % 2 === 0 ? outer : inner
		context.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length)
	}
	context.closePath()
	context.fill()
}

// Hur nära en linjes hörn (grader) en stjärna ska stå för att höra till en figur som saknar
// stjärnbildsbeteckning, som de nordiska.
const ON_LINE = 0.2

// Hur mycket en stjärna i en framlyft stjärnbild lyser upp (0…1).
function litness(pen: Pen) {
	const { raised, strength, scene } = pen
	if (raised.length === 0) return null
	// Figurer vars id är en stjärnbildsbeteckning känner igen sina stjärnor på den; de andra på
	// linjernas hörn.
	const corners = raised.map(figure =>
		scene.stars.some(star => star.constellation === figure.id) ? null : figure.lines.flat(),
	)
	return (star: SceneStar) => {
		let lit = 0
		raised.forEach((figure, index) => {
			const member =
				star.constellation === figure.id ||
				corners[index]?.some(([azimuth, altitude]) =>
					Math.abs(altitude - star.at[1]) < ON_LINE &&
					Math.abs(((azimuth - star.at[0] + 540) % 360) - 180) * Math.cos((altitude * Math.PI) / 180) < ON_LINE,
				) === true
			if (member) lit = Math.max(lit, strength(figure))
		})
		return lit
	}
}

/**
 * Stjärnorna, ljusast först. Under inladdningen tänds de i den ordningen, som i skymningen.
 * Stjärnorna i en stjärnbild som pekas ut eller är vald tänds: de lyser fullt och lite större,
 * och också de svagaste i bilden kommer fram. Ger tillbaka dem som ska ha text, så att
 * textlagret slipper projicera dem en gång till.
 */
export function drawStars(pen: Pen): LabelledStar[] {
	const { context, projection, scene, ink, onScreen, intro, starLimit, letterLimit, starScale } = pen
	const emerged = -2 + (starLimit + 3) * ease(intro / 0.75)
	const lit = litness(pen)
	const labelled: LabelledStar[] = []
	context.fillStyle = ink
	for (const star of scene.stars) {
		const shown = star.magnitude <= starLimit && star.magnitude <= emerged
		// Utan framlyft stjärnbild är resten av stjärnorna för svaga för att ritas.
		if (!shown && !lit) break
		const glow = lit ? lit(star) * ease(intro) : 0
		if (!shown && glow === 0) continue
		const point = projection(star.at)
		if (!onScreen(point)) continue
		const alpha = shown ? Math.min(1, emerged - star.magnitude, (starLimit - star.magnitude) / 0.5) : 0
		context.globalAlpha = Math.max(alpha, glow)
		drawStar(context, point[0], point[1], star.magnitude, starScale * (1 + 0.35 * glow))
		if (shown && (star.name || (star.magnitude < letterLimit && star.letter))) labelled.push({ star, point })
	}
	return labelled
}

/** Den valda stjärnan märks med fyra korta streck som sluter sig kring den. */
export function drawMarks({ context, projection, ink, onScreen, marks, starScale }: Pen) {
	context.strokeStyle = ink
	context.lineWidth = 1
	for (const mark of marks) {
		const point = projection(mark.at)
		if (!onScreen(point)) continue
		const gap = 10 * starScale + 10 * (1 - mark.level)
		context.globalAlpha = mark.level
		context.beginPath()
		for (const [x, y] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
			context.moveTo(point[0] + x * gap, point[1] + y * gap)
			context.lineTo(point[0] + x * (gap + 7), point[1] + y * (gap + 7))
		}
		context.stroke()
	}
}
