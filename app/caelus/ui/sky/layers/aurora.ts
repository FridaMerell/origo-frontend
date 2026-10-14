import { AURORA_STEP, type AuroraBand } from "../aurora"
import type { SkyPoint } from "../types"
import { dialShownAt } from "../view"
import { mix, prepare, type Pen } from "./pen"

const RADIAN = Math.PI / 180

// Banden i sammanhängande bitar runt horisonten.
function runs(bands: AuroraBand[]) {
	const result: AuroraBand[][] = []
	let previous: number | null = null
	for (const band of bands) {
		if (previous === null || band.azimuth - previous > AURORA_STEP) result.push([])
		result[result.length - 1].push(band)
		previous = band.azimuth
	}
	return result
}

// Norrskenet är en ridå i rummet, inte en bild på himlen: en lodrät, veckad ridå några hundra km
// bort, som ses från ögat och därför ändrar vinkel när man vrider, tippar och zoomar. Den
// graveras som på en kopparplåt. Först ritas ridåns ton på en egen yta: många svaga lager som
// alla börjar vid foten och slutar allt lägre, så att tonen är starkast nertill och tonar jämnt
// bort uppåt. Sedan dras ridåns linjer, mycket fina och täta, lodräta i rummet så att de strålar
// ihop i perspektiv; tonen avgör hur starkt de trycker igenom.
const LAYERS = 10
// Tonens styrka vid foten, i vanliga fall och med norrskensfokus.
const BRIGHTEST = [0.16, 0.32]
// Ridåns fot lyser extra: så stor del av höjden nertill, i så många lager.
const HEM = 0.07
const HEM_LAYERS = 3
// Linjerna: en per steg i azimut. Steget väljs i hela fördubblingar, så att linjerna behåller
// sina platser när man zoomar.
// Lika täta på båda papperen; på ljust papper något kraftigare, eftersom inget sken ligger under:
// [mörkt, ljust].
const LINE_SPACING = [1.5, 1.5]
const LINE_WIDTH = [0.28, 0.4]
// Ridån som föremål i rummet, i km: fotens höjd över marken (norrskenets nedre kant), hur högt
// den reser sig, hur långt bort den som mest ritas, och hur mycket den veckar sig i djupled som
// andel av avståndet. Där den buktar mot betraktaren är den också högre.
const CURTAIN_FOOT = 110
const CURTAIN_HEIGHT = 170
const FARTHEST = 1600
const DEPTH_FOLD = 0.15
const DEPTH_HEIGHT = 0.45
// Ridåns skikt i djupled: hur mycket längre bort varje skikt ligger, hur förskjutna dess veck är
// (grader i azimut) och hur starkt det lyser.
const SHEETS = [
	{ distance: 1, shift: 0, strength: 1 },
	{ distance: 1.1, shift: 3, strength: 0.5 },
]
const SHEET_TOTAL = SHEETS.reduce((total, sheet) => total + sheet.strength, 0)
// Över hur många steg i azimut (grader) ridån sjunker mot horisonten och blir lägre i ändarna.
const TAPER = 35
// Där draperiet ses från kanten packas strålarna tätt: från så mycket vändning läggs en extra
// linje in.
const EDGE_ON = 0.6
// Två punkter på ridån längre isär än så på kartan hör inte ihop: där har en del av ridån
// hamnat utanför det kartan kan visa.
const GAP = 150

// Ridån lyser mjukt: under linjerna ligger ett svagt, slätt sken av dess egen ton, så stark.
// På ljust papper lyser ingenting; där graveras ridån bara med linjerna, som trycker igenom
// starkare, utan sken under.
const SOFT = [0.45, 0]
const LIGHT_LINES = 2.2
// Rörelse: vecken driver långsamt längs ridån och de ljusa partierna åt andra hållet, i grader
// per sekund, som när ett norrsken böljar.
const FOLD_DRIFT = 0.9
const GLOW_DRIFT = 1.6

// Ytorna som tonen och linjerna ritas på, återanvända mellan bilderna.
let tone: HTMLCanvasElement | null = null
let lines: HTMLCanvasElement | null = null
// Tiden i sekunder för den bild som ritas, och om ridån syns och rör sig, så att kartan vet att
// den ska fortsätta rita.
let now = 0
let moving = false

/** Sant när norrskenet syns och rör sig, så att kartan ska ritas om löpande. */
export function auroraMoving() {
	return moving
}

// Draperiets djup, från −1 (längst bort) till 1 (närmast): långsamma vågor som driver längs ridån.
function depth(azimuth: number) {
	const at = azimuth - now * FOLD_DRIFT
	return 0.65 * Math.sin(at * 0.11) + 0.35 * Math.sin(at * 0.23 + 1)
}
// Hur mycket draperiet vänder sig mot eller från betraktaren just där (0…1).
function turning(azimuth: number) {
	return Math.min(1, Math.abs(depth(azimuth + 0.5) - depth(azimuth - 0.5)) * 6)
}
// Ljusare och svagare partier längs ridån, i vågor på 10–30 grader.
function glowing(azimuth: number) {
	const at = azimuth + now * GLOW_DRIFT
	return 0.5 + 0.5 * (0.6 * Math.sin(at * 0.21 + 4) + 0.4 * Math.sin(at * 0.47 + 9.4))
}
// Ett tal mellan 0 och 1 som alltid är detsamma för samma frö.
function steady(seed: number) {
	const value = Math.sin(seed * 12.9898) * 43758.5453
	return value - Math.floor(value)
}

// Ridåns kolumner tätare, med mjuka kurvor (Catmull-Rom) genom de uträknade punkterna i
// stället för raka streck mellan dem, så att fot och topp inte blir kantiga.
const SMOOTHING = 3
function smoothed<T extends { azimuth: number; turn: number; bright: number; foot: [number, number]; top: [number, number] }>(
	columns: T[],
): T[] {
	const curve = (a: number, b: number, c: number, d: number, t: number) =>
		0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t)
	const result: T[] = []
	for (let index = 0; index < columns.length - 1; index++) {
		const a = columns[Math.max(0, index - 1)]
		const b = columns[index]
		const c = columns[index + 1]
		const d = columns[Math.min(columns.length - 1, index + 2)]
		for (let step = 0; step < SMOOTHING; step++) {
			const t = step / SMOOTHING
			const point = (pick: (column: T) => [number, number]) =>
				[0, 1].map(axis => curve(pick(a)[axis], pick(b)[axis], pick(c)[axis], pick(d)[axis], t)) as [number, number]
			result.push({
				...b,
				azimuth: b.azimuth + (c.azimuth - b.azimuth) * t,
				turn: b.turn + (c.turn - b.turn) * t,
				bright: b.bright + (c.bright - b.bright) * t,
				foot: point(column => column.foot),
				top: point(column => column.top),
			})
		}
	}
	result.push(columns[columns.length - 1])
	return result
}

/**
 * Var norrsken kan synas vid tidpunktens Kp-index, enligt modellen i sky/aurora.ts, som en ridå
 * i rummet: foten där ovalens närmaste kant ligger, veckad i djupled, sedd från ett öga som
 * förskjuts när man navigerar, så att ridån ändrar vinkel som ett föremål under kupolen. Den
 * graveras i norrskenets färg, starkast vid foten och uttonande uppåt. Svag i vanliga fall och
 * tydligare med norrskensfokus, då etiketten också står även utzoomat.
 */
export function drawAurora(pen: Pen) {
	const { context: canvas, projection, scene, view, width, height, ratio, aurora: color, paper, family, onScreen, label, spacing, named, auroraFocus, light } = pen
	const aurora = scene.aurora
	moving = false
	if (!aurora) return
	// Med minskad rörelse står ridån still av sig själv. Kartans tid driver också vecken, så att
	// ridån böljer när man vrider tiden: en minut på kartan flyttar dem lika långt som en sekund
	// i verkligheten.
	const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches
	now = (still ? 0 : performance.now() / 1000) + scene.dial.time / 60_000
	// Utzoomad, när kalenderskivan syns, är himlen liten: där blir ridån tydligare och etiketten
	// står kvar, så att det syns hur norrskenet ändras när skivan vrids.
	const dial = dialShownAt(view.zoom)
	const emphasis = Math.max(auroraFocus, dial)

	// En punkt i rummet (km norrut, österut, uppåt från platsen) som den syns därifrån, som en
	// punkt på himlen.
	const seen = (north: number, east: number, up: number): SkyPoint => {
		const azimuth = Math.atan2(east, north) / RADIAN
		return [azimuth > 180 ? azimuth - 360 : azimuth, Math.atan2(up, Math.hypot(north, east)) / RADIAN]
	}

	// Ridåns fot och topp i varje riktning, i kartans pixlar. Ridån delas där en del av den inte
	// går att visa eller hoppar långt, så att bitarna inte dras ihop tvärs över kartan.
	// Varje kolumn har också sin ljusstyrka: starkare där draperiet viker sig och vänder kanten mot
	// betraktaren, svagare där det ligger längre bort.
	type Column = { azimuth: number; turn: number; bright: number; foot: [number, number]; top: [number, number] }
	// Ridåns ändar på kartan, och hur långt in från dem den tonar bort.
	const tails: { at: [number, number]; reach: number }[] = []
	// Ridån har volym: den byggs av flera tunna skikt bakom varandra, vart och ett lite längre bort
	// och lite svagare, med nästan samma veck, så att de följer varandra som lager i en tjock ridå.
	const pieces: { strength: number; front: boolean; edge: Column[] }[] = []
	for (const sheet of SHEETS) {
	for (const run of runs(aurora.bands)) {
		let piece: Column[] = []
		const close = () => {
			if (piece.length > 1) pieces.push({ strength: sheet.strength, front: sheet === SHEETS[0], edge: smoothed(piece) })
			piece = []
		}
		run.forEach((band, index) => {
			const ends = Math.min(1, (index + 1) / TAPER, (run.length - index) / TAPER)
			const settle = Math.sin((ends * Math.PI) / 2)
			const near = depth(band.azimuth + sheet.shift)
			// Foten så långt bort längs marken som modellens båge ligger, veckad i djupled; mot
			// ändarna längre bort, så att ridån sjunker mot horisonten.
			// Gränserna är mjuka, så att foten inte får något knä där de tar vid: vinkeln närmar sig
			// 1,5° och avståndet FARTHEST gradvis i stället för att kapas.
			const elevation = Math.hypot(band.lower + (band.arc - band.lower) * settle, 1.5)
			const away =
				FARTHEST *
				Math.tanh(CURTAIN_FOOT / Math.tan(elevation * RADIAN) / FARTHEST) *
				(1 - DEPTH_FOLD * near) *
				sheet.distance
			// Ridån behåller en del av sin höjd ända ut i ändarna, så att den inte smalnar till en
			// spets; där tonar den i stället bort.
			const rise =
				CURTAIN_HEIGHT * (0.4 + 0.6 * settle) * (0.55 + 0.45 * glowing(band.azimuth)) * (1 + DEPTH_HEIGHT * near)
			const north = Math.cos(band.azimuth * RADIAN) * away
			const east = Math.sin(band.azimuth * RADIAN) * away
			const foot = projection(seen(north, east, CURTAIN_FOOT))
			const top = projection(seen(north, east, CURTAIN_FOOT + rise))
			const previous = piece[piece.length - 1]
			const apart = foot && previous ? Math.hypot(foot[0] - previous.foot[0], foot[1] - previous.foot[1]) : 0
			const tallOnMap = foot && top ? Math.hypot(top[0] - foot[0], top[1] - foot[1]) : 0
			if (!foot || !top || apart > GAP || tallOnMap > GAP * 4) {
				close()
				if (!foot || !top || tallOnMap > GAP * 4) return
			}
			const turn = turning(band.azimuth)
			const bright = Math.min(1, (0.4 + 0.6 * glowing(band.azimuth)) * (0.65 + 0.35 * near) + 0.45 * turn)
			piece.push({ azimuth: band.azimuth, turn, bright, foot, top })
			// Ridåns verkliga ändar, där den ska tona bort.
			if (index === 0 || index === run.length - 1) {
				const inward = run[index === 0 ? Math.min(run.length - 1, TAPER) : Math.max(0, run.length - 1 - TAPER)]
				const middle = projection(
					seen(Math.cos(inward.azimuth * RADIAN) * 600, Math.sin(inward.azimuth * RADIAN) * 600, CURTAIN_FOOT),
				)
				if (middle) tails.push({ at: foot, reach: Math.hypot(middle[0] - foot[0], middle[1] - foot[1]) })
			}
		})
		close()
	}
	}
	if (pieces.length === 0) return
	// Kartan ritas om för rörelsen bara när någon del av ridån syns.
	moving = !still && pieces.some(({ edge }) => edge.some(({ foot, top }) => onScreen(foot) || onScreen(top)))

	const toned = prepare(tone, width, height, ratio)
	tone = toned.surface
	const drawn = prepare(lines, width, height, ratio)
	lines = drawn.surface
	toned.context.fillStyle = color
	const strokes = new Path2D()
	const fine: { path: Path2D; alpha: number }[] = []
	for (const { strength, front, edge } of pieces) {
		// Skiktens ton läggs på varandra; den delas mellan dem, så att ridån som helhet inte blir
		// ljusare än ett ensamt skikt.
		toned.context.globalAlpha =
			(mix(BRIGHTEST[0], BRIGHTEST[1], emphasis) / LAYERS) * 2 * (strength / SHEET_TOTAL) * 1.6 * (light ? LIGHT_LINES : 1)
		// Tonen: varje lager går från foten upp till en allt lägre andel av höjden, och de sista
		// lagren bara en smal bit, så att foten lyser skarpt.
		for (let layer = 0; layer < LAYERS + HEM_LAYERS; layer++) {
			const reach = layer < LAYERS ? (1 - layer / LAYERS) ** 1.4 : HEM
			toned.context.beginPath()
			edge.forEach(({ foot }, index) =>
				index ? toned.context.lineTo(foot[0], foot[1]) : toned.context.moveTo(foot[0], foot[1]),
			)
			for (let index = edge.length - 1; index >= 0; index--) {
				const { foot, top } = edge[index]
				toned.context.lineTo(foot[0] + (top[0] - foot[0]) * reach, foot[1] + (top[1] - foot[1]) * reach)
			}
			toned.context.closePath()
			toned.context.fill()
		}
		// Linjerna: steget i azimut ger ungefär LINE_SPACING pixlar mellan dem på kartan.
		let along = 0
		for (let index = 1; index < edge.length; index++) {
			along += Math.hypot(edge[index].foot[0] - edge[index - 1].foot[0], edge[index].foot[1] - edge[index - 1].foot[1])
		}
		const perDegree = along / (edge[edge.length - 1].azimuth - edge[0].azimuth || 1)
		// De bakre skikten får hälften så många linjer: de är svagare och syns ändå genom tonen.
		// Linjerna sitter på två täthetsnivåer: de glesa, var annan, syns alltid, och de mellanliggande
		// tonas in och ut mjukt med zoomen, så att inga linjer plötsligt kommer eller försvinner.
		const spacing = (LINE_SPACING[light ? 1 : 0] / Math.max(perDegree, 0.01)) * (front ? 1 : 2)
		const step = 2 ** Math.floor(Math.log2(spacing))
		const between = new Path2D()
		fine.push({ path: between, alpha: Math.min(1, Math.max(0, (2 * step - spacing) / step)) })
		for (let index = 1; index < edge.length; index++) {
			const from = edge[index - 1]
			const to = edge[index]
			for (let azimuth = Math.ceil(from.azimuth / step) * step; azimuth < to.azimuth; azimuth += step) {
				const share = (azimuth - from.azimuth) / (to.azimuth - from.azimuth)
				const stroke = Math.round(azimuth / step) % 2 === 0 ? strokes : between
				const footX = from.foot[0] + (to.foot[0] - from.foot[0]) * share
				const footY = from.foot[1] + (to.foot[1] - from.foot[1]) * share
				const riseX = from.top[0] + (to.top[0] - from.top[0]) * share - footX
				const riseY = from.top[1] + (to.top[1] - from.top[1]) * share - footY
				const length = Math.hypot(riseX, riseY)
				if (length < 1) continue
				// Linjen börjar vid foten och går förbi toppen; tonen bestämmer var den bleknar bort.
				// Den slingrar sig lite, i en fas som hör till azimuten.
				const sideX = -riseY / length
				const sideY = riseX / length
				const phase = steady(azimuth) * Math.PI * 2
				const sway = 0.25 + 0.35 * steady(azimuth + 0.6)
				for (let t = 0; t <= 1.1; t += 0.11) {
					const bend = Math.sin(t * 4 + phase) * sway
					const x = footX + riseX * t + sideX * bend
					const y = footY + riseY * t + sideY * bend
					if (t === 0) stroke.moveTo(x, y)
					else stroke.lineTo(x, y)
				}
			}
		}
	}
	drawn.context.strokeStyle = color
	drawn.context.lineWidth = LINE_WIDTH[light ? 1 : 0]
	drawn.context.stroke(strokes)
	for (const { path, alpha } of fine) {
		drawn.context.globalAlpha = alpha
		drawn.context.stroke(path)
	}
	drawn.context.globalAlpha = 1
	// Mot ridåns ändar tonar tonen mjukt bort, så att ridån löses upp i stället för att sluta i en
	// spets; både skenet och linjerna följer tonen.
	toned.context.globalAlpha = 1
	toned.context.globalCompositeOperation = "destination-out"
	for (const { at, reach } of tails) {
		if (reach < 2) continue
		const fade = toned.context.createRadialGradient(at[0], at[1], 0, at[0], at[1], reach)
		fade.addColorStop(0, "rgba(0,0,0,1)")
		fade.addColorStop(1, "rgba(0,0,0,0)")
		toned.context.fillStyle = fade
		toned.context.fillRect(at[0] - reach, at[1] - reach, reach * 2, reach * 2)
	}
	toned.context.globalCompositeOperation = "source-over"
	// Tonen bestämmer hur starkt linjerna trycker igenom: bara linjerna blir kvar, lika starka
	// som tonen under dem.
	drawn.context.setTransform(1, 0, 0, 1, 0, 0)
	drawn.context.globalCompositeOperation = "destination-in"
	drawn.context.drawImage(toned.surface, 0, 0)
	drawn.context.globalCompositeOperation = "source-over"
	canvas.save()
	canvas.setTransform(1, 0, 0, 1, 0, 0)
	// Först det mjuka skenet av ridåns ton, sedan linjerna ovanpå.
	canvas.globalAlpha = SOFT[light ? 1 : 0]
	canvas.drawImage(toned.surface, 0, 0)
	canvas.globalAlpha = 1
	canvas.drawImage(drawn.surface, 0, 0)
	canvas.restore()

	// Etiketten står strax ovanför ridåns högsta punkt, mot den geomagnetiska polen.
	const lettered = Math.max(named, emphasis)
	if (lettered <= 0.01) return
	const highest = aurora.bands.reduce((best, band) => (band.upper > best.upper ? band : best))
	const point = projection([highest.azimuth, Math.min(highest.upper, 60) + 2] as SkyPoint)
	if (!onScreen(point)) return
	canvas.globalAlpha = lettered * mix(0.8, 1, auroraFocus)
	canvas.font = `500 13px ${family}`
	canvas.textAlign = "center"
	canvas.textBaseline = "alphabetic"
	canvas.fillStyle = color
	canvas.strokeStyle = paper
	canvas.lineWidth = 3.5
	spacing("0.2em")
	const kp = aurora.kp.toLocaleString("sv-SE", { maximumFractionDigits: 1 })
	label(`NORRSKEN · KP ${kp}`, point[0], point[1], auroraFocus > 0.5)
	spacing("0px")
	canvas.globalAlpha = 1
}
