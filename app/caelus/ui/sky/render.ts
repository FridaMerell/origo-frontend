import { drawAurora } from "./layers/aurora"
import { drawBodies } from "./layers/bodies"
import { drawClouds } from "./layers/clouds"
import { drawDial } from "./layers/dial"
import { drawFigures } from "./layers/figures"
import { drawGrid } from "./layers/grid"
import { drawGround } from "./layers/ground"
import { drawNames } from "./layers/names"
import { drawMeteors } from "./layers/meteors"
import { drawMilkyWay } from "./layers/milky-way"
import { createPen, type Box, type Frame, type Pen } from "./layers/pen"
import { drawMarks, drawStars } from "./layers/stars"

export type { Frame }

// Allt under norrskenet från den senaste hela bilden: det står still medan bara norrskenet och
// meteorerna rör sig, så då läggs det tillbaka i stället för att ritas om. `key` är det i bilden
// som inte syns i bildrutan självt (storlek, täthet, temats färger); texterna som stod på kartan
// följer med, så att planeternas namn hamnar på samma ställen som i den hela bilden.
let below: { canvas: HTMLCanvasElement; key: string; taken: Box[] } | null = null

const keyOf = (pen: Pen) => [pen.width, pen.height, pen.ratio, pen.ink, pen.paper, pen.aurora].join(":")

/**
 * Ritar en bildruta, lager för lager nerifrån och upp. Med `motionOnly` har ingenting ändrats
 * sedan förra bilden utom norrskenets och meteorernas rörelse.
 */
export function drawScene(canvas: HTMLCanvasElement, frame: Frame, motionOnly = false) {
	if (motionOnly && below) {
		const pen = createPen(canvas, frame, below.taken)
		if (!pen) return
		if (keyOf(pen) === below.key) {
			pen.context.save()
			pen.context.setTransform(1, 0, 0, 1, 0, 0)
			pen.context.drawImage(below.canvas, 0, 0)
			pen.context.restore()
			drawMoving(pen)
			return
		}
	}

	const pen = createPen(canvas, frame)
	if (!pen) return
	// Molnen ligger underst, så att de aldrig skymmer något.
	drawClouds(pen)
	drawMilkyWay(pen)
	drawGrid(pen)
	drawFigures(pen)
	const labelled = drawStars(pen)
	drawMarks(pen)
	drawNames(pen, labelled)
	// Med planet- eller norrskensfokus läggs en slöja av papper över stjärnor, figurer och namn,
	// så att det som lyfts fram står ut. Ljust papper bleker mer än mörkt, så slöjan är tunnare där.
	const focus = Math.max(pen.planetFocus, pen.auroraFocus)
	if (focus > 0) {
		pen.context.globalAlpha = (pen.light ? 0.35 : 0.65) * focus
		pen.context.fillStyle = pen.paper
		pen.context.fillRect(0, 0, pen.width, pen.height)
		pen.context.globalAlpha = 1
	}

	// Medan handen rör kartan ritas varje bild hel ändå, så då sparas ingenting.
	if (frame.moving) below = null
	else {
		const saved = below?.canvas ?? document.createElement("canvas")
		if (saved.width !== canvas.width || saved.height !== canvas.height) {
			saved.width = canvas.width
			saved.height = canvas.height
		}
		const savedContext = saved.getContext("2d")!
		savedContext.clearRect(0, 0, saved.width, saved.height)
		savedContext.drawImage(canvas, 0, 0)
		below = { canvas: saved, key: keyOf(pen), taken: [...pen.taken] }
	}

	drawMoving(pen)
}

// Norrskenet och meteorerna, som rör sig, och det som ligger över dem.
function drawMoving(pen: Pen) {
	drawAurora(pen)
	drawMeteors(pen)
	drawBodies(pen)
	// Marken täcker allt som gått ner under horisonten, och kalenderskivan ligger på marken.
	drawGround(pen)
	drawDial(pen)
}
