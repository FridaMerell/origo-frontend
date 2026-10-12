import { drawAurora } from "./layers/aurora"
import { drawBodies } from "./layers/bodies"
import { drawDial } from "./layers/dial"
import { drawFigures } from "./layers/figures"
import { drawGrid } from "./layers/grid"
import { drawGround } from "./layers/ground"
import { drawNames } from "./layers/names"
import { drawMilkyWay } from "./layers/milky-way"
import { createPen, type Frame } from "./layers/pen"
import { drawMarks, drawStars } from "./layers/stars"

export type { Frame }

/** Ritar en bildruta, lager för lager nerifrån och upp. */
export function drawScene(canvas: HTMLCanvasElement, frame: Frame) {
	const pen = createPen(canvas, frame)
	if (!pen) return
	drawMilkyWay(pen)
	drawGrid(pen)
	drawFigures(pen)
	const labelled = drawStars(pen)
	drawMarks(pen)
	drawNames(pen, labelled)
	// Med planet- eller norrskensfokus läggs en slöja av papper över stjärnor, figurer och namn,
	// så att det som lyfts fram står ut.
	const focus = Math.max(pen.planetFocus, pen.auroraFocus)
	if (focus > 0) {
		pen.context.globalAlpha = 0.65 * focus
		pen.context.fillStyle = pen.paper
		pen.context.fillRect(0, 0, pen.width, pen.height)
	}
	drawAurora(pen)
	drawBodies(pen)
	// Marken täcker allt som gått ner under horisonten, och kalenderskivan ligger på marken.
	drawGround(pen)
	drawDial(pen)
}
