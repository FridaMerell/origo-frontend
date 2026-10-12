import type { Body } from "astronomy-engine"
import type { Scene, View } from "./types"
import { detailOf, makeProjection, starLimitAt } from "./view"

// Hur nära en linje man måste peka för att träffa en figur utan gränser.
const FIGURE_DISTANCE = 28
// Hur nära en stjärna man måste klicka för att öppna den.
const STAR_DISTANCE = 16
// Och en himlakropp, vars ring är större.
const BODY_DISTANCE = 22

function distanceToSegment(
	[x, y]: [number, number],
	[fromX, fromY]: [number, number],
	[toX, toY]: [number, number],
) {
	const length = (toX - fromX) ** 2 + (toY - fromY) ** 2
	const along =
		length === 0 ? 0 : Math.min(1, Math.max(0, ((x - fromX) * (toX - fromX) + (y - fromY) * (toY - fromY)) / length))
	return Math.hypot(x - fromX - along * (toX - fromX), y - fromY - along * (toY - fromY))
}

/**
 * Figuren under en punkt på kartan: stjärnbildens hela område där det finns gränser, annars
 * den figur vars linjer ligger närmast.
 */
export function pickFigure(scene: Scene, view: View, width: number, height: number, x: number, y: number) {
	if (scene.figures.length === 0) return null
	const projection = makeProjection(view, width, height)
	if (scene.figureAt) {
		const at = projection.invert?.([x, y])
		if (!at || at[1] < 0) return null
		const id = scene.figureAt(at)
		return scene.figures.some(figure => figure.id === id) ? id : null
	}
	let nearest: string | null = null
	let distance = FIGURE_DISTANCE
	for (const figure of scene.figures) {
		for (const line of figure.lines) {
			const points = line.map(vertex => projection(vertex))
			for (let index = 1; index < points.length; index++) {
				const from = points[index - 1]
				const to = points[index]
				if (!from || !to) continue
				const candidate = distanceToSegment([x, y], from, to)
				if (candidate < distance) {
					distance = candidate
					nearest = figure.id
				}
			}
		}
	}
	return nearest
}

/** Solen, månen eller planeten närmast en punkt på kartan, om någon ligger nära nog. */
export function pickBody(scene: Scene, view: View, width: number, height: number, x: number, y: number) {
	const projection = makeProjection(view, width, height)
	let nearest: Body | null = null
	let distance = BODY_DISTANCE
	for (const { body, at } of scene.bodies) {
		const point = projection(at)
		if (!point) continue
		const candidate = Math.hypot(point[0] - x, point[1] - y)
		if (candidate < distance) {
			distance = candidate
			nearest = body
		}
	}
	return nearest
}

/**
 * Radnumret för den ritade stjärna som ligger närmast en punkt på kartan, om någon ligger nära
 * nog. Av två som ligger tätt vinner den ljusare.
 */
export function pickStar(scene: Scene, view: View, width: number, height: number, x: number, y: number) {
	const projection = makeProjection(view, width, height)
	const limit = starLimitAt(detailOf(view, width, height))
	let nearest: number | null = null
	let score = Infinity
	for (const star of scene.stars) {
		if (star.magnitude > limit) break
		if (star.at[1] < 0) continue
		const point = projection(star.at)
		if (!point) continue
		const distance = Math.hypot(point[0] - x, point[1] - y)
		if (distance > STAR_DISTANCE) continue
		const candidate = distance + star.magnitude
		if (candidate < score) {
			score = candidate
			nearest = star.index
		}
	}
	return nearest
}
