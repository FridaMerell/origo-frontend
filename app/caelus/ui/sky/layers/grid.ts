import type { Pen } from "./pen"

/** Himlens gradnät, svagt i bakgrunden. */
export function drawGrid({ context, path, ink, scene, contrast }: Pen) {
	context.strokeStyle = ink
	context.globalAlpha = 0.16 * contrast
	context.lineWidth = 0.6
	context.beginPath()
	path({ type: "MultiLineString", coordinates: scene.graticule })
	context.stroke()
}
