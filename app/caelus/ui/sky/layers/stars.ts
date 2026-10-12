import type { SceneStar } from "../types"
import { ease } from "../view"
import type { Pen } from "./pen"

// En stjärna som ska ha namn eller bokstav, och var den hamnade på kartan.
export type LabelledStar = { star: SceneStar; point: [number, number] }

// Stjärntecken i storleksklasser som i en atlas teckenförklaring: åtta, sex och fem uddar för
// de tre ljusaste klasserna, sedan punkter.
function drawStar(
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

/**
 * Stjärnorna, ljusast först. Under inladdningen tänds de i den ordningen, som i skymningen.
 * Ger tillbaka dem som ska ha text, så att textlagret slipper projicera dem en gång till.
 */
export function drawStars(pen: Pen): LabelledStar[] {
	const { context, projection, scene, ink, onScreen, intro, starLimit, letterLimit, starScale } = pen
	const emerged = -2 + (starLimit + 3) * ease(intro / 0.75)
	const labelled: LabelledStar[] = []
	context.fillStyle = ink
	for (const star of scene.stars) {
		if (star.magnitude > starLimit || star.magnitude > emerged) break
		const point = projection(star.at)
		if (!onScreen(point)) continue
		context.globalAlpha = Math.min(1, emerged - star.magnitude, (starLimit - star.magnitude) / 0.5)
		drawStar(context, point[0], point[1], star.magnitude, starScale)
		if (star.name || (star.magnitude < letterLimit && star.letter)) labelled.push({ star, point })
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
