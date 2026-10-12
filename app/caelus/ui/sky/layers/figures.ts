import { drawArt } from "../art"
import type { Figure } from "../types"
import { ease } from "../view"
import { mix, type Pen } from "./pen"

/**
 * Stjärnbildernas teckningar och linjer. Teckningen tonar in under den stjärnbild som pekas ut
 * eller är vald, och dess egna linjer träder då tillbaka för den.
 */
export function drawFigures(pen: Pen) {
	const { context, path, projection, scene, ink, art, raised, plain, strength, receded, outgoing, figureIntro } = pen

	for (const figure of raised) {
		const drawing = art.get(figure.id)
		const shown = drawing ? strength(figure) * drawing.arrived : 0
		if (drawing && shown > 0) drawArt(context, projection, scene, drawing, ink, shown)
	}

	const stroke = (figures: Figure[], alpha: number, lineWidth: number) => {
		context.globalAlpha = alpha
		context.lineWidth = lineWidth
		context.beginPath()
		for (const figure of figures) path({ type: "MultiLineString", coordinates: figure.lines })
		context.stroke()
	}
	context.strokeStyle = ink
	if (outgoing) stroke(outgoing.figures, 0.5 * outgoing.alpha, 0.8)
	// Varje linje börjar om streckmönstret, så alla dras ut från sin första stjärna samtidigt.
	const engraved = ease(figureIntro / 0.75)
	if (engraved < 1) context.setLineDash([engraved * 900, 100_000])
	stroke(plain, 0.5 * receded, 0.8)
	for (const figure of raised) {
		const covered = strength(figure) * (art.get(figure.id)?.arrived ?? 0)
		stroke(
			[figure],
			mix(0.5 * receded, 1, strength(figure)) * (1 - 0.8 * covered),
			0.8 + 0.5 * strength(figure),
		)
	}
	context.setLineDash([])
}
