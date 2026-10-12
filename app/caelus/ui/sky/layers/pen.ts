import { geoPath, type GeoPath, type GeoProjection } from "d3-geo"
import type { Art, Figure, Level, Scene, SkyPoint, View } from "../types"
import { detailOf, ease, makeProjection, starLimitAt } from "../view"

// Allt som bestämmer en bildruta.
export type Frame = {
	scene: Scene
	view: View
	width: number
	height: number
	// 0…1 medan himlen träder fram: först de ljusaste stjärnorna, som i skymningen, och sist
	// stjärnornas namn och bokstäver.
	intro: number
	// 0…1 medan figurerna graveras in: vid första laddningen och när man byter himmel.
	figureIntro: number
	levels: Map<string, Level>
	// Den förra himlens figurer, på väg ut.
	outgoing: { figures: Figure[]; alpha: number } | null
	// Valda stjärnor och hur långt deras märke hunnit (0…1); fler än en medan en tonar ut.
	marks: { at: SkyPoint; level: number }[]
	// Teckningar som hämtats, efter figurens id.
	art: Map<string, Art>
	// 0…1: hur långt planetfokus har tonat in. Solen, månen och planeterna lyfts då fram och
	// resten av himlen träder tillbaka.
	planetFocus: number
	// 0…1: detsamma för norrskensfokus, som lyfter fram var norrsken kan synas.
	auroraFocus: number
	// 0…1: hur långt övrig text har tonats ner för en framlyft figur.
	lifted: number
}

// Det lagren delar under en bildruta: ritytan, projektionen, temats färger och det som räknats
// fram en gång ur bildrutan.
export type Pen = Frame & {
	context: CanvasRenderingContext2D
	projection: GeoProjection
	path: GeoPath
	ink: string
	paper: string
	// Norrskenets färg.
	aurora: string
	family: string
	// Om en projicerad punkt ligger på eller strax utanför kartan.
	onScreen: (point: [number, number] | null) => point is [number, number]
	// Text med papprets färg som kontur, så att den går att läsa över linjer och stjärnor. Text
	// som skulle hamna på en redan ritad text flyttas ett steg ner, och utgår om det inte heller
	// går, så det som ritas först har företräde. Med `always` ritas texten där den ska stå ändå.
	label: (text: string, x: number, y: number, always?: boolean) => void
	spacing: (value: string) => void
	// Fyller en yta med fin diagonal skraffering i en färg, som skuggning på en kopparplåt.
	// `draw` lägger ytans kontur i den aktuella stigen.
	hatch: (color: string, draw: () => void) => void
	// Ritytans pixlar per kartans enhet.
	ratio: number
	// Figurerna som är framlyfta av pekaren eller valet, och de övriga.
	raised: Figure[]
	plain: Figure[]
	// Hur framlyft en figur är, 0…1.
	strength: (figure: Figure) => number
	// När en figur är vald träder de andra tillbaka (1 = inte alls), så att det syns vilka linjer
	// och stjärnor som hör till just den, också där två figurer delar en stjärna.
	receded: number
	// 0…1: hur mycket av en stjärnbilds teckning som syns just nu. Texten ovanpå den tonas då
	// bort, så att bilden står i fokus.
	drawnFor: (id: string) => number
	// När en figur är framlyft, av pekaren eller valet, tonas övrig text ner (1 = inte alls), så
	// att figurens namn, bild och stjärnor står fram utan att kartan blir rörig.
	quieted: number
	// Kartans detaljnivå (se detailOf). Fler stjärnor, bokstäver och namn träder fram när den
	// ökar, mjukt och inte i steg.
	detail: number
	// 0…1: hur mycket text kartan har plats för. Utzoomad, där himlen är för liten för att namnen
	// ska få plats, står inga namn alls (varken stjärnbilder, stjärnor eller planeter); de tonar
	// in när man zoomar in.
	named: number
	starLimit: number
	letterLimit: number
	starScale: number
	// Hur långt stjärnornas respektive figurernas text har tonat in.
	lettered: number
	figuresLettered: number
}

const LABEL_SIZE = 17
// Skrafferingen: hårfina streck med 3,2 px mellanrum, vridna 38°, som på en kopparplåt.
const HATCH_SPACING = 3.2
const HATCH_WIDTH = 0.7
const HATCH_ANGLE = 38
const hatchTiles = new Map<string, HTMLCanvasElement>()

// En ruta med ett lodrätt streck som upprepas till skraffering och vrids när den läggs ut, en
// per färg och pixeltäthet.
function hatchTile(color: string, ratio: number) {
	const key = `${color}:${ratio}`
	let tile = hatchTiles.get(key)
	if (!tile) {
		tile = document.createElement("canvas")
		tile.width = Math.round(HATCH_SPACING * ratio)
		tile.height = 1
		const context = tile.getContext("2d")!
		context.fillStyle = color
		context.fillRect(0, 0, HATCH_WIDTH * ratio, 1)
		hatchTiles.set(key, tile)
	}
	return tile
}

/**
 * Fyller en yta med skraffering på en rityta som har `ratio` pixlar per kartans enhet. `draw`
 * lägger ytans kontur i den aktuella stigen.
 */
export function fillHatched(
	context: CanvasRenderingContext2D,
	color: string,
	ratio: number,
	width: number,
	height: number,
	draw: () => void,
) {
	const pattern = context.createPattern(hatchTile(color, ratio), "repeat")
	if (!pattern) return
	// Rutan är i skärmens pixlar; den skalas till kartans och vrids till skrafferingens vinkel.
	pattern.setTransform(new DOMMatrix().rotateSelf(HATCH_ANGLE).scaleSelf(1 / ratio, 1 / ratio))
	context.save()
	context.beginPath()
	draw()
	context.clip()
	context.fillStyle = pattern
	context.fillRect(0, 0, width, height)
	context.restore()
}

// Detaljnivån där namnen börjar tona in. Helt utzoomad är den ungefär 0,46 på en skrivbordsskärm
// och 0,22 på en telefon, så där står inga namn; vid zoom 1 är den 1,3 respektive 0,6.
const NAMED_FROM = 0.5

export function mix(from: number, to: number, amount: number) {
	return from + (to - from) * amount
}

/** Gör i ordning ritytan för en bildruta. Null om webbläsaren inte ger någon rityta. */
export function createPen(canvas: HTMLCanvasElement, frame: Frame): Pen | null {
	const { scene, view, width, height, intro, figureIntro, levels } = frame
	const context = canvas.getContext("2d")
	if (!context) return null
	const ratio = window.devicePixelRatio || 1
	if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
		canvas.width = Math.round(width * ratio)
		canvas.height = Math.round(height * ratio)
	}
	context.setTransform(ratio, 0, 0, ratio, 0, 0)
	context.clearRect(0, 0, width, height)
	context.lineJoin = "round"
	context.lineCap = "round"

	// Färger och typsnitt läses från temat varje bildruta, så att ljust och mörkt läge följer med.
	const styles = getComputedStyle(canvas)
	const projection = makeProjection(view, width, height)

	const taken: { left: number; right: number; top: number; bottom: number }[] = []
	const label = (text: string, x: number, y: number, always = false) => {
		const textWidth = context.measureText(text).width
		const left = context.textAlign === "center" ? x - textWidth / 2 : x
		for (const shift of [0, LABEL_SIZE + 4]) {
			const box = { left, right: left + textWidth, top: y + shift - LABEL_SIZE, bottom: y + shift + 4 }
			const free = always || taken.every(
				other =>
					box.right < other.left ||
					box.left > other.right ||
					box.bottom < other.top ||
					box.top > other.bottom,
			)
			if (!free) continue
			taken.push(box)
			context.strokeText(text, x, y + shift)
			context.fillText(text, x, y + shift)
			return
		}
	}

	const detail = detailOf(view, width, height)
	let selection = 0
	for (const level of levels.values()) selection = Math.max(selection, level.select)
	const drawnFor = (id: string) => {
		const level = levels.get(id)
		return level ? Math.max(level.hover, level.select) * (frame.art.get(id)?.arrived ?? 0) : 0
	}

	return {
		...frame,
		context,
		projection,
		path: geoPath(projection, context),
		ink: styles.color,
		paper: styles.getPropertyValue("--bg").trim(),
		aurora: styles.getPropertyValue("--aurora").trim() || styles.color,
		family: styles.fontFamily,
		onScreen: (point): point is [number, number] =>
			point !== null && point[0] > -40 && point[0] < width + 40 && point[1] > -40 && point[1] < height + 40,
		label,
		spacing: value => {
			if ("letterSpacing" in context) context.letterSpacing = value
		},
		hatch: (color, draw) => fillHatched(context, color, ratio, width, height, draw),
		ratio,
		raised: scene.figures.filter(figure => levels.has(figure.id)),
		plain: scene.figures.filter(figure => !levels.has(figure.id)),
		strength: figure => {
			const level = levels.get(figure.id)
			return level ? Math.max(level.hover, level.select) : 0
		},
		receded: 1 - 0.4 * selection,
		drawnFor,
		quieted: 1 - 0.8 * frame.lifted,
		detail,
		named: ease((detail - NAMED_FROM) / 0.15),
		starLimit: starLimitAt(detail),
		letterLimit: Math.min(4.6, 2.6 + Math.log2(detail) * 0.9),
		starScale: Math.min(1.8, Math.max(0.7, Math.sqrt(detail))),
		lettered: ease((intro - 0.6) / 0.4),
		figuresLettered: ease((figureIntro - 0.45) / 0.55),
	}
}
