import type { GeoProjection } from "d3-geo"
import type { Art, ArtFile, SkyPoint } from "./types"

// Hur täckande teckningen är som mest, så att stjärnorna och linjerna syns igenom den.
const OPACITY = 0.6
// Gråvärden i bilderna, som är vitt stick på svart: mörkare än GROUND blir helt genomskinligt,
// ljusare än LINE helt täckande.
const GROUND = 14
const LINE = 215

// Förteckningen över teckningar, hämtad första gången någon teckning behövs.
let index: Promise<Record<string, ArtFile>> | null = null

/**
 * Hämtar en stjärnbilds teckning, med bilden avkodad. Null om stjärnbilden saknar teckning. Går
 * hämtningen fel försöker nästa anrop på nytt.
 */
export function fetchArt(id: string): Promise<Art | null> {
	index ??= fetch("/data/figures.json")
		.then(response => (response.ok ? response.json() : Promise.reject()))
		.then((payload: { figures: Record<string, ArtFile> }) => payload.figures)
	return index
		.then(async figures => {
			const file = figures[id]
			if (!file) return null
			const picture = new Image()
			picture.src = file.image
			await picture.decode()
			return { ...file, picture, tinted: null, arrived: 0 }
		})
		.catch(error => {
			index = null
			throw error
		})
}

// Bildens svarta botten blir genomskinlig och sticket får kartans bläckfärg, så att teckningen
// fungerar mot både ljus och mörk bakgrund. Görs en gång per bild och färg.
function tint(art: Art, ink: string) {
	if (art.tinted?.ink === ink) return art.tinted.canvas
	const canvas = document.createElement("canvas")
	canvas.width = art.picture.naturalWidth
	canvas.height = art.picture.naturalHeight
	const context = canvas.getContext("2d", { willReadFrequently: true })!
	context.drawImage(art.picture, 0, 0)
	const [red, green, blue] = (ink.match(/[\d.]+/g) ?? ["0", "0", "0"]).map(Number)
	const image = context.getImageData(0, 0, canvas.width, canvas.height)
	const pixels = image.data
	for (let offset = 0; offset < pixels.length; offset += 4) {
		const line = (pixels[offset] - GROUND) / (LINE - GROUND)
		pixels[offset] = red
		pixels[offset + 1] = green
		pixels[offset + 2] = blue
		pixels[offset + 3] = Math.min(1, Math.max(0, line)) * 255
	}
	context.putImageData(image, 0, 0)
	art.tinted = { ink, canvas }
	return canvas
}

// En triangel ur bilden ritad på en triangel på skärmen.
function drawTriangle(
	context: CanvasRenderingContext2D,
	texture: HTMLCanvasElement,
	source: [number, number][],
	target: [number, number][],
) {
	const [[u0, v0], [u1, v1], [u2, v2]] = source
	const [[x0, y0], [x1, y1], [x2, y2]] = target
	const determinant = (u1 - u0) * (v2 - v0) - (u2 - u0) * (v1 - v0)
	if (determinant === 0) return
	const a = ((x1 - x0) * (v2 - v0) - (x2 - x0) * (v1 - v0)) / determinant
	const c = ((x2 - x0) * (u1 - u0) - (x1 - x0) * (u2 - u0)) / determinant
	const b = ((y1 - y0) * (v2 - v0) - (y2 - y0) * (v1 - v0)) / determinant
	const d = ((y2 - y0) * (u1 - u0) - (y1 - y0) * (u2 - u0)) / determinant
	// Klippytan görs en aning större än triangeln, annars syns skarvarna som hårfina linjer.
	const centreX = (x0 + x1 + x2) / 3
	const centreY = (y0 + y1 + y2) / 3
	context.save()
	context.beginPath()
	for (const [x, y] of target) {
		const reach = Math.hypot(x - centreX, y - centreY) || 1
		context.lineTo(x + ((x - centreX) / reach) * 0.7, y + ((y - centreY) / reach) * 0.7)
	}
	context.closePath()
	context.clip()
	context.transform(a, b, c, d, x0 - a * u0 - c * v0, y0 - b * u0 - d * v0)
	context.drawImage(texture, 0, 0)
	context.restore()
}

/**
 * Ritar en teckning som ett nät av trianglar, så att den följer kartans projektion när man
 * panorerar och zoomar. `toSky` för nätets noder (rektascension och deklination) dit
 * projektionen tar emot dem. `shown` är hur långt den tonat in (0…1).
 */
export function drawArt(
	context: CanvasRenderingContext2D,
	projection: GeoProjection,
	toSky: (equatorial: [number, number]) => SkyPoint,
	art: Art,
	ink: string,
	shown: number,
) {
	const texture = tint(art, ink)
	const points = art.nodes.map(node => projection(toSky(node)))
	const across = art.columns + 1
	const corner = (column: number, row: number) => ({
		source: [(column / art.columns) * texture.width, (row / art.rows) * texture.height] as [number, number],
		target: points[row * across + column],
	})
	context.globalAlpha = OPACITY * shown
	for (let row = 0; row < art.rows; row++) {
		for (let column = 0; column < art.columns; column++) {
			const cell = [corner(column, row), corner(column + 1, row), corner(column, row + 1), corner(column + 1, row + 1)]
			if (cell.some(({ target }) => target === null)) continue
			for (const triangle of [
				[cell[0], cell[1], cell[2]],
				[cell[1], cell[3], cell[2]],
			]) {
				drawTriangle(
					context,
					texture,
					triangle.map(({ source }) => source),
					triangle.map(({ target }) => target as [number, number]),
				)
			}
		}
	}
}
