import { deepSkyShown, type DeepSkyObject } from "../deep-sky"
import { mix, type Box, type Pen } from "./pen"

// Namnens höjd i pixlar, för att se om två krockar.
const LABEL_HEIGHT = 15

// Galaxerna och nebulosorna lyser som norrskenets sken: en mjuk, slät ton i objektets rymdfärg,
// utan prickar och utan streck. Formen finns i tonen själv: spiralgalaxernas armar och varma
// kärna, nebulosornas slingrande moln, de planetariska nebulosornas ring och supernovarestens
// trådar. Tonen räknas en gång per objekt till en liten bild som sedan ritas i objektets verkliga
// storlek och lutning; de minsta förstoras till en storlek som går att se och ta på.

// Halva storaxeln som minst, i kartans pixlar: utan och med fokus.
const LEAST = [3.5, 9]
// Tonens täckning där objektet lyser starkast: [mörkt, ljust] papper. På ljust papper lyser
// ingenting; där läggs tonen som en lavering som färgar papperet (multiplicering), svagare.
const PEAK = [1, 0.65]
// Raden med himlarna och menyn överst på kartan, i pixlar; inga namn under den.
const TOP_ROW = 56
// Med planet- eller norrskensfokus träder galaxerna tillbaka som resten av himlen.
const RECEDED = 0.25

// Ett tal mellan 0 och 1 som alltid är detsamma för samma frö.
function steady(seed: number) {
	const value = Math.sin(seed * 12.9898) * 43758.5453
	return value - Math.floor(value)
}

// En färgs kanaler, för en färg skriven som #rrggbb eller rgb(…).
function channels(color: string): [number, number, number] {
	const values = color.startsWith("#")
		? [1, 3, 5].map(start => parseInt(color.slice(start, start + 2), 16))
		: (color.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number)
	const [red = 0, green = 0, blue = 0] = values
	return [red, green, blue]
}

// Mjukt värdebrus, alltid detsamma för samma punkt och frö.
function smoothNoise(x: number, y: number, seed: number) {
	const cell = (ix: number, iy: number) => steady(ix * 127.1 + iy * 311.7 + seed * 74.7)
	const smooth = (t: number) => t * t * (3 - 2 * t)
	const ix = Math.floor(x)
	const iy = Math.floor(y)
	const fx = smooth(x - ix)
	const fy = smooth(y - iy)
	const top = cell(ix, iy) + (cell(ix + 1, iy) - cell(ix, iy)) * fx
	const bottom = cell(ix, iy + 1) + (cell(ix + 1, iy + 1) - cell(ix, iy + 1)) * fx
	return top + (bottom - top) * fy
}

// Brus i flera lager, från grova former till fina detaljer (0…1).
function fractal(x: number, y: number, seed: number, octaves = 5) {
	let sum = 0
	let weight = 0.5
	let total = 0
	let frequency = 1
	for (let octave = 0; octave < octaves; octave++) {
		sum += weight * smoothNoise(x * frequency, y * frequency, seed + octave * 13)
		total += weight
		weight *= 0.5
		frequency *= 2.03
	}
	return sum / total
}

const smoothstep = (from: number, to: number, value: number) => {
	const t = Math.min(1, Math.max(0, (value - from) / (to - from)))
	return t * t * (3 - 2 * t)
}

// Hur starkt objektet lyser i en punkt i sin enhetscirkel (0…1), sedd rakt framifrån, och hur
// stor del av färgen som är galaxkärnans varma färg (0…1). Allt tonar mjukt till noll vid kanten.
function glow(object: DeepSkyObject, x: number, y: number): [number, number] {
	const r = Math.hypot(x, y)
	if (r >= 1) return [0, 0]
	const fade = (1 - r * r) ** 2
	const seed = object.index
	switch (object.kind) {
		case "spiral": {
			// En liten, ljus kärna i en ljusare utbuktning, och två spiralarmar (logaritmisk spiral)
			// som löses upp i klumpar mot skivans kant.
			// Varje galax har sin egen spiral: två eller tre armar, olika hårt lindade och olika
			// skarpa, och en del är flockiga, med korta, upplösta armstumpar i stället för långa armar.
			const angle = Math.atan2(y, x) + steady(seed) * Math.PI * 2
			const count = steady(seed + 0.11) < 0.7 ? 2 : 3
			const winding = 3.5 + 4 * steady(seed + 0.23)
			const sharpness = 1.5 + 2.5 * steady(seed + 0.37)
			const flocculent = steady(seed + 0.51) < 0.3
			const warp = fractal(x * 2 + 5, y * 2 + 5, seed, 3)
			const spiral = (0.5 + 0.5 * Math.cos(count * angle - winding * Math.log(r + 0.05) + warp * (flocculent ? 6 : 2.5))) ** sharpness
			const clumps = 0.55 + 0.9 * fractal(x * 6, y * 6, seed + 5, 4)
			const arms = flocculent ? 0.5 * spiral + 0.5 * fractal(x * 7, y * 7, seed + 9, 4) : spiral
			const core = Math.exp(-((r / 0.08) ** 2))
			const bulge = 0.4 * Math.exp(-((r / 0.26) ** 2))
			const disc = 0.7 * Math.exp(-r / 0.55) * (0.3 + 0.7 * arms * clumps)
			return [Math.min(1, (core + bulge + disc) * fade), Math.min(1, core + bulge * 1.6)]
		}
		case "elliptical":
			// Jämnt avtagande från en tät kärna, utan skiva.
			return [Math.min(1, (Math.exp(-3.4 * r) + 0.4 * Math.exp(-((r / 0.07) ** 2))) * fade), 1]
		case "lenticular": {
			const core = Math.exp(-((r / 0.12) ** 2))
			return [Math.min(1, (core + 0.7 * Math.exp(-r / 0.3)) * fade), Math.min(1, core + 0.5)]
		}
		case "irregular": {
			const clouds = Math.max(0, fractal(x * 2.5, y * 2.5, seed) - 0.3) * 1.8
			return [Math.min(1, (0.15 + clouds) * Math.exp(-1.2 * r) * fade), 0.15]
		}
		case "planetary":
			// En tunn, mjuk ring kring ett svagt sken i mitten.
			return [0.75 * Math.min(1, (0.8 * Math.exp(-(((r - 0.55) / 0.12) ** 2)) + 0.35 * Math.exp(-((r / 0.4) ** 2))) * fade), 0]
		case "remnant": {
			// Tunna, ljusa trådar längs brusets nivåkurvor över ett svagt sken.
			const level = fractal(x * 1.8, y * 1.8, seed, 5)
			const threads = Math.exp(-(((level - 0.5) / 0.035) ** 2)) + 0.5 * Math.exp(-(((level - 0.38) / 0.025) ** 2))
			return [Math.min(1, (0.18 * Math.exp(-1.5 * r) + 0.85 * threads) * fade), 0]
		}
		default: {
			// Moln: några förskjutna lober av olika storlek, så att nebulosan breder ut sig ojämnt
			// i stället för att bli en ellips, och i dem brus som vrids av annat brus, så att molnen
			// slingrar sig. Reflexionsnebulosorna är jämnare, utan mörka hål.
			let lobes = 0
			for (let lobe = 0; lobe < 4; lobe++) {
				const angle = steady(seed * 5 + lobe) * Math.PI * 2
				const reach = lobe === 0 ? 0.05 : 0.12 + 0.13 * steady(seed * 5 + lobe + 0.4)
				const size = lobe === 0 ? 0.6 : 0.4 + 0.2 * steady(seed * 5 + lobe + 0.7)
				const dx = x - Math.cos(angle) * reach
				const dy = y - Math.sin(angle) * reach
				lobes = Math.max(lobes, (lobe === 0 ? 1 : 0.75) * Math.exp(-((dx * dx + dy * dy) / (size * size))))
			}
			const warpX = fractal(x * 1.6 + 3.1, y * 1.6, seed + 1, 4)
			const warpY = fractal(x * 1.6, y * 1.6 + 7.3, seed + 2, 4)
			const texture = fractal(x * 2.2 + warpX * 1.4, y * 2.2 + warpY * 1.4, seed, 6)
			const clouds = object.kind === "reflection" ? 0.6 + 0.4 * texture : 0.35 + 0.9 * smoothstep(0.25, 0.8, texture)
			const strength = object.kind === "emission" ? 0.8 : 0.85
			return [Math.min(1, strength * lobes * clouds * fade), 0]
		}
	}
}

// Objektets färg och dess kärnas färg: galaxerna har en varm kärna i en blåare skiva, övriga en
// enda färg.
function coloursOf(object: DeepSkyObject, space: Pen["space"]): [string, string] {
	switch (object.kind) {
		case "spiral":
		case "elliptical":
		case "lenticular":
			return [space["galaxy-disc"], space["galaxy-core"]]
		case "irregular":
			return [space["galaxy-disc"], space["galaxy-disc"]]
		case "planetary":
			return [space["planetary-nebula"], space["planetary-nebula"]]
		case "reflection":
			return [space["reflection-nebula"], space["reflection-nebula"]]
		case "remnant":
			return [space.remnant, space.remnant]
		default:
			return [space.nebula, space.nebula]
	}
}

// Tonens bilder, en per objekt, storlek och färger, räknade första gången de behövs.
const tones = new Map<string, HTMLCanvasElement>()
function toneOf(object: DeepSkyObject, pixels: number, space: Pen["space"]) {
	// Bildens sida i pixlar: så stor att tonen är slät i den storlek den ritas, i fasta steg så att
	// samma bild används medan man zoomar.
	const side = pixels < 20 ? 32 : pixels < 60 ? 64 : pixels < 160 ? 128 : 256
	const [base, core] = coloursOf(object, space)
	const key = `${object.index}:${side}:${base}:${core}`
	const known = tones.get(key)
	if (known) return known
	const surface = document.createElement("canvas")
	surface.width = side
	surface.height = side
	const context = surface.getContext("2d")!
	const image = context.createImageData(side, side)
	const from = channels(base)
	const to = channels(core)
	for (let row = 0; row < side; row++) {
		for (let column = 0; column < side; column++) {
			const x = ((column + 0.5) / side) * 2 - 1
			const y = ((row + 0.5) / side) * 2 - 1
			const [value, share] = glow(object, x, y)
			const at = (row * side + column) * 4
			for (let channel = 0; channel < 3; channel++) {
				image.data[at + channel] = Math.round(from[channel] + (to[channel] - from[channel]) * share)
			}
			image.data[at + 3] = Math.round(255 * value ** 0.75)
		}
	}
	context.putImageData(image, 0, 0)
	tones.set(key, surface)
	return surface
}

/**
 * Galaxerna och nebulosorna. Svaga i vanliga fall, och bara de ljusaste tills man zoomar in;
 * med fokus alla, tydligt och med namn.
 */
export function drawDeepSky(pen: Pen) {
	const { context: canvas, projection, scene, width, height, ratio, ink, paper, family, onScreen, taken, named, detail, light } = pen
	const focus = pen.deepSkyFocus
	if (scene.deepSky.length === 0) return
	// Följeslagare till ett mycket större objekt, inom dess storaxels längd (M 32 och M 110 vid
	// Andromedagalaxen, M 43 vid Orionnebulosan), förstoras inte: de ritas i verklig storlek och
	// utan namn, så att de inte växer ihop med det stora till en rörig fläck.
	const apart = ([azimuth, altitude]: [number, number], [otherAzimuth, otherAltitude]: [number, number]) => {
		const radian = Math.PI / 180
		const cosine =
			Math.sin(altitude * radian) * Math.sin(otherAltitude * radian) +
			Math.cos(altitude * radian) * Math.cos(otherAltitude * radian) * Math.cos((azimuth - otherAzimuth) * radian)
		return Math.acos(Math.min(1, Math.max(-1, cosine))) / radian
	}
	const companions = new Set(
		scene.deepSky
			.filter(object =>
				scene.deepSky.some(other => other.major > object.major * 3 && apart(object.at, other.at) < other.major / 60),
			)
			.map(object => object.index),
	)
	const receded = 1 - (1 - RECEDED) * Math.max(pen.planetFocus, pen.auroraFocus) * (1 - focus)

	// `u` och `v` är de ritade halvaxlarna, `realU` och `realV` de verkliga.
	type Shape = {
		object: DeepSkyObject
		shown: number
		centre: [number, number]
		u: number[]
		v: number[]
		realU: number[]
		realV: number[]
		reach: number
	}
	const shapes: Shape[] = []

	// Formerna i verklig storlek och lutning. De allra minsta förstoras bara till en storlek som
	// går att se, med formen i behåll, så att en liten nebulosa aldrig blir större än en stor galax.
	for (const object of scene.deepSky) {
		const shown = deepSkyShown(object.magnitude, detail, focus) * receded
		if (shown <= 0.01) continue
		const centre = projection(object.at)
		const majorEnd = projection(object.majorEnd)
		const minorEnd = projection(object.minorEnd)
		if (!centre || !majorEnd || !minorEnd || !onScreen(centre)) continue
		const realU = [majorEnd[0] - centre[0], majorEnd[1] - centre[1]]
		const realV = [minorEnd[0] - centre[0], minorEnd[1] - centre[1]]
		let u = realU
		let v = realV
		const real = Math.hypot(u[0], u[1])
		// Ett objekt som projiceras orimligt stort ligger vid kartans kant, där projektionen spricker.
		if (real > Math.max(width, height) * 2) continue
		// Den minsta storleken följer den verkliga, så att de stora fortfarande är störst: från 0,7
		// gånger grundstorleken för de minsta (1′) till 1,6 gånger för Andromedagalaxen (3°).
		// Inzoomat växer den minsta storleken med zoomen, så att också de små objekten får form.
		// De planetariska nebulosorna är bara några bågminuter stora och hålls mindre än galaxerna.
		const least =
			mix(LEAST[0], LEAST[1], focus) *
			Math.max(1, detail ** 0.75) *
			(object.kind === "planetary" ? 0.7 : 1) *
			(0.7 + 0.9 * Math.min(1, Math.max(0, Math.log10(Math.max(object.major, 1)) / Math.log10(180))))
		if (real < least && !companions.has(object.index)) {
			const grow = least / Math.max(real, 0.01)
			u = [u[0] * grow, u[1] * grow]
			v = [v[0] * grow, v[1] * grow]
		}
		const reach = companions.has(object.index) ? Math.max(real, 1) : Math.max(real, least)
		shapes.push({ object, shown, centre, u, v, realU, realV, reach })
	}
	if (shapes.length === 0) return

	const scaled = ([x, y]: number[], factor: number) => [x * factor, y * factor]
	// Om en punkt ligger inom en form.
	const within = ([x, y]: [number, number], { centre, u, v }: Shape) => {
		const determinant = u[0] * v[1] - u[1] * v[0]
		if (Math.abs(determinant) < 1e-6) return false
		const dx = x - centre[0]
		const dy = y - centre[1]
		const a = (dx * v[1] - dy * v[0]) / determinant
		const b = (u[0] * dy - u[1] * dx) / determinant
		return a * a + b * b < 1
	}
	// Ett objekt som ligger inuti ett tydligt större, som M 32 i Andromedagalaxen eller M 43 i
	// Orionnebulosan, får inget namn mitt i det större.
	// Inuti räknas med den verkliga formen, inte den förstorade: två små objekt som bara ritas
	// stora ligger inte i varandra (det sköts av regeln för former som ligger på varandra nedan).
	const inner = new Set(
		shapes
			.filter(shape =>
				shapes.some(
					other =>
						other !== shape &&
						other.object.major > shape.object.major * 1.5 &&
						within(shape.centre, { ...other, u: other.realU, v: other.realV }),
				),
			)
			.map(shape => shape.object.index)
			.concat([...companions]),
	)

	// Tonen, i objektets egen enhetscirkel: storaxeln längs x och lillaxeln längs y. De största
	// ritas först, så att små objekt framför dem syns.
	canvas.save()
	canvas.imageSmoothingEnabled = true
	canvas.imageSmoothingQuality = "high"
	if (light) canvas.globalCompositeOperation = "multiply"
	for (const { object, shown, centre, u, v: minorAxis } of [...shapes].sort((a, b) => b.reach - a.reach)) {
		let v = minorAxis
		// Lillaxeln får inte bli tunnare än ett par pixlar, så att en galax på kant syns.
		const across = Math.hypot(v[0], v[1])
		const thinnest = 2
		if (across < thinnest) {
			const length = Math.hypot(u[0], u[1]) || 1
			v = [(-u[1] / length) * thinnest, (u[0] / length) * thinnest]
		}
		const majorPixels = Math.max(Math.hypot(u[0], u[1]), 0.01)
		canvas.globalAlpha = Math.min(1, shown * mix(0.8, 1, focus) * PEAK[light ? 1 : 0])
		canvas.setTransform(ratio * u[0], ratio * u[1], ratio * v[0], ratio * v[1], ratio * centre[0], ratio * centre[1])
		canvas.drawImage(toneOf(object, majorPixels * ratio, pen.space), -1, -1, 2, 2)
	}
	canvas.restore()
	canvas.globalAlpha = 1

	canvas.font = `italic 15px ${family}`
	canvas.textAlign = "center"
	canvas.textBaseline = "alphabetic"
	canvas.fillStyle = ink
	canvas.strokeStyle = paper
	canvas.lineWidth = 3.5
	// Namnen. Inget tvingas fram: ett namn som skulle hamna på annan text eller på en annan galax
	// väntar tills man zoomar in. Objekt med svenskt namn och de ljusaste får sin plats först.
	// Ett namn står tätt intill sitt objekt, under, över eller vid sidan av det, aldrig längre bort.
	// Utan fokus står bara namn på objekt som syns tydligt nog att se vad namnet hör till.
	// Hur långt formen syns åt sidorna och uppåt/nedåt från mitten: ellipsens verkliga utbredning,
	// och bara den del där tonen syns (den tonar bort mot kanten), så att namnet står tätt intill.
	const VISIBLE = 0.55
	const spans = (u: number[], v: number[]) => [VISIBLE * Math.hypot(u[0], v[0]), VISIBLE * Math.hypot(u[1], v[1])]
	const obstacles = shapes
		.filter(shape => shape.reach >= 3)
		.map(({ object, centre, u, v }) => {
			const [spanX, spanY] = spans(u, v)
			const box: Box = { left: centre[0] - spanX, right: centre[0] + spanX, top: centre[1] - spanY, bottom: centre[1] + spanY }
			return { index: object.index, box }
		})
	const overlaps = (box: Box, other: Box) =>
		!(box.right < other.left || box.left > other.right || box.bottom < other.top || box.top > other.bottom)
	// Två former som ligger på varandra på kartan ser ut som en fläck: bara en får ett namn tills de
	// skiljs åt när man zoomar in. Ett svenskt namn går före, sedan den största, sedan den ljusaste.
	const bigger = (a: Shape, b: Shape) => {
		if (Boolean(a.object.name) !== Boolean(b.object.name)) return Boolean(a.object.name)
		if (a.object.major !== b.object.major) return a.object.major > b.object.major
		return a.object.magnitude < b.object.magnitude
	}
	// Två former räknas som en fläck när den enas mitt ligger i eller tätt intill den andras form,
	// eller när de är så små att de ligger inom några pixlar från varandra.
	const merged = (shape: Shape) =>
		shapes.some(
			other =>
				other !== shape &&
				!inner.has(other.object.index) &&
				bigger(other, shape) &&
				(within(shape.centre, { ...other, u: scaled(other.u, 1.6), v: scaled(other.v, 1.6) }) ||
					within(other.centre, { ...shape, u: scaled(shape.u, 1.6), v: scaled(shape.v, 1.6) }) ||
					Math.hypot(other.centre[0] - shape.centre[0], other.centre[1] - shape.centre[1]) < 10),
		)
	const candidates = shapes
		.filter(shape => !inner.has(shape.object.index) && !merged(shape))
		.map(shape => ({ ...shape, lettered: shape.shown * mix(shape.object.name ? 0.75 * named : 0, 1, focus) }))
		.filter(shape => shape.lettered > 0.01 && (focus > 0.5 || shape.reach >= 10))
		.sort((a, b) => Number(Boolean(b.object.name)) - Number(Boolean(a.object.name)) || a.object.magnitude - b.object.magnitude)
	for (const { object, centre, u, v, lettered } of candidates) {
		const text = object.name || object.designation
		const textWidth = canvas.measureText(text).width
		const [spanX, spanY] = spans(u, v)
		// Under, över, till höger och till vänster om formen, några pixlar från dess synliga kant:
		// [mitt x, baslinje]. Under och över glider namnet in från kartans kant hellre än att sticka ut.
		const middle = Math.min(width - textWidth / 2 - 10, Math.max(textWidth / 2 + 10, centre[0]))
		const spots: [number, number][] = [
			[middle, centre[1] + spanY + 13],
			[middle, centre[1] - spanY - 4],
			[centre[0] + spanX + 5 + textWidth / 2, centre[1] + 5],
			[centre[0] - spanX - 5 - textWidth / 2, centre[1] + 5],
		]
		for (const [x, y] of spots) {
			const box = { left: x - textWidth / 2 - 4, right: x + textWidth / 2 + 4, top: y - LABEL_HEIGHT, bottom: y + 4 }
			// Ett namn som inte ryms helt på kartan, under raden överst, utgår hellre än klipps av.
			if (box.left < 6 || box.right > width - 6 || box.top < TOP_ROW || box.bottom > height - 4) continue
			// Inte heller under horisonten, där marken och väderstrecken ritas ovanpå.
			const ground = ([x, y]: [number, number]) => {
				const at = projection.invert?.([x, y])
				return !at || at[1] < 0
			}
			if (ground([box.left, box.bottom]) || ground([box.right, box.bottom])) continue
			if (taken.some(other => overlaps(box, other))) continue
			if (obstacles.some(other => other.index !== object.index && overlaps(box, other.box))) continue
			taken.push(box)
			canvas.globalAlpha = lettered
			canvas.strokeText(text, x, y)
			canvas.fillText(text, x, y)
			break
		}
	}
	canvas.globalAlpha = 1
}
