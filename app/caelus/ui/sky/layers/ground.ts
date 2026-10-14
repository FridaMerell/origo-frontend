import { geoCircle } from "d3-geo"
import { wrap } from "../scene"
import { dialShownAt } from "../view"
import type { Pen } from "./pen"

const COMPASS = ["N", "NO", "O", "SO", "S", "SV", "V", "NV"]

// Allt under horisonten.
const GROUND = geoCircle().center([0, -90]).radius(90).precision(2)()
const HORIZON_TICKS = {
	type: "MultiLineString" as const,
	coordinates: Array.from({ length: 36 }, (_, index) => {
		const azimuth = wrap(index * 10)
		return [
			[azimuth, 0],
			[azimuth, index % 3 === 0 ? -2 : -1],
		]
	}),
}

/** Marken, som täcker det som gått ner, med horisontens gradstreck och väderstrecken. */
export function drawGround({ context, path, projection, view, ink, paper, family, onScreen }: Pen) {
	// När kalenderskivan ligger runt horisonten står bara de fyra väderstrecken kvar innanför
	// den; gradstrecken och mellanstrecken tonar bort.
	const dial = dialShownAt(view.zoom)
	context.globalAlpha = 1
	context.fillStyle = paper
	context.strokeStyle = ink
	context.lineWidth = 1.2
	context.beginPath()
	path(GROUND)
	context.fill()
	context.stroke()
	context.lineWidth = 1
	context.globalAlpha = 1 - dial
	context.beginPath()
	path(HORIZON_TICKS)
	context.stroke()

	context.fillStyle = ink
	context.textAlign = "center"
	context.textBaseline = "middle"
	COMPASS.forEach((direction, index) => {
		const cardinal = index % 2 === 0
		const point = projection([wrap(index * 45), -5 + 1.5 * dial])
		if (!onScreen(point)) return
		context.globalAlpha = cardinal ? 1 : 1 - dial
		context.font = `${cardinal ? `500 ${20 - 7 * dial}px` : "italic 16px"} ${family}`
		context.fillText(direction, point[0], point[1])
	})
	context.globalAlpha = 1
}
