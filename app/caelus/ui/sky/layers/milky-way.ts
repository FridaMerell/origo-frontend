import { geoPath } from "d3-geo"
import type { Scene } from "../types"
import { dialShownAt } from "../view"
import { fillHatched, type Pen } from "./pen"

// Vintergatan ritad en gång till en egen yta, och vad den gäller för. Kartan ritas om i varje
// bild medan något glider (en figur som lyfts fram, en stjärna som märks), men Vintergatan
// ändras bara med himlen, blickriktningen, storleken och färgen.
let cache: { key: string; scene: Scene; canvas: HTMLCanvasElement } | null = null

/**
 * Vintergatan, som fin skraffering längst ner under allt annat. Nivåerna överlappar och var och
 * en är lite tydligare än den utanför, så att skrafferingen tätnar mot kärnan. Utzoomad, när
 * kalenderskivan syns, tonar den bort.
 */
export function drawMilkyWay({ context, projection, ink, scene, view, width, height, ratio }: Pen) {
	const shown = 1 - dialShownAt(view.zoom)
	if (shown <= 0.01) return
	const key = [view.azimuth, view.altitude, view.zoom, width, height, ratio, ink].join(":")
	if (cache?.scene !== scene || cache.key !== key) {
		const canvas = cache?.canvas ?? document.createElement("canvas")
		canvas.width = Math.round(width * ratio)
		canvas.height = Math.round(height * ratio)
		const surface = canvas.getContext("2d")!
		surface.setTransform(ratio, 0, 0, ratio, 0, 0)
		surface.clearRect(0, 0, width, height)
		const path = geoPath(projection, surface)
		scene.milkyWay().forEach((polygons, level) => {
			surface.globalAlpha = 0.1 + level * 0.05
			fillHatched(surface, ink, ratio, width, height, () => path({ type: "MultiPolygon", coordinates: polygons }))
		})
		cache = { key, scene, canvas }
	}
	context.save()
	context.setTransform(1, 0, 0, 1, 0, 0)
	context.globalAlpha = shown
	context.drawImage(cache.canvas, 0, 0)
	context.restore()
}
