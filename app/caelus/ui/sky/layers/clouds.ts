import type { Pen } from "./pen"

const RADIAN = Math.PI / 180

// Prognosen säger hur stor del av himlen som är täckt, inte var molnen står. Molnen på kartan är
// därför en bild av mängden: ett molntäcke på en tänkt höjd över platsen, sett underifrån som
// insidan av en kupol, vars luckor sluter sig när molnigheten ökar. Molnen ligger bakom allt
// annat på kartan, som Vintergatan, så att de aldrig skymmer stjärnor, figurer eller namn. De är
// platta, skarpt avgränsade former med bullig kant, i tre svaga toner som blir ljusare inåt och
// ger molnet volym; inga linjer och inga konturer. Grafikkortet räknar ut dem för varje pixel,
// och molnen flyttar sig med tiden.

// Hur många av brusets enheter som går på molntäckets plan från zenit till 45° höjd; större tal
// ger mindre moln.
const SCALE = 2.1
// Jordens krökning gör att täcket aldrig når ända ner till horisonten: så mycket läggs till
// höjdens sinus, vilket avgör hur hoptryckta molnen blir längst ner.
const CURVATURE = 0.16
// Under den här höjden (grader) löses molnen upp.
const HAZE_BELOW = 7
// Molnens bullar, i två storlekar: hur många som går på en av brusets enheter och hur höga de är.
const BIG_BUMPS = 2.6
const BIG = 0.34
const SMALL_BUMPS = 6.1
const SMALL = 0.12
// Hur högt över kanten nästa ton börjar, och de höjder i ytans hela spann där den andra och
// tredje tonen tidigast börjar.
const STEP = 0.12
const MIDDLE = 0.8
const TOP = 0.95
// Molnets tre toner, som andel bläck över nattens färg.
const TONES = [0.07, 0.12, 0.17]
// Hur långt täcket flyttar sig per timme, i brusets enheter: några grader på himlen.
const DRIFT_PER_HOUR = 0.4
const OCTAVES = 3
// Marginal så att inga luckor blir kvar vid helt mulet.
const OVERCAST_MARGIN = 0.6

const VERTEX = `
attribute vec2 corner;
void main() {
	gl_Position = vec4(corner, 0.0, 1.0);
}`

const FRAGMENT = `
#extension GL_OES_standard_derivatives : enable
precision highp float;
uniform vec2 translate;
uniform float scale;
uniform float ratio;
uniform float height;
// Blickriktningens azimut och höjd, som cosinus och sinus.
uniform vec2 azimuth;
uniform vec2 altitude;
uniform float limit;
uniform float shown;
uniform vec2 drift;
uniform vec3 ink;

float hash(vec2 p) {
	p = fract(p * vec2(123.34, 456.21));
	p += dot(p, p + 45.32);
	return fract(p.x * p.y);
}

float noise(vec2 p) {
	vec2 cell = floor(p);
	vec2 f = fract(p);
	vec2 s = f * f * (3.0 - 2.0 * f);
	return mix(
		mix(hash(cell), hash(cell + vec2(1.0, 0.0)), s.x),
		mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0, 1.0)), s.x),
		s.y
	);
}

float density(vec2 p) {
	p += 0.9 * (vec2(noise(p * 0.8 + vec2(11.3, 4.1)), noise(p * 0.8 + vec2(-7.7, 23.9))) - 0.5);
	float sum = 0.0;
	float weight = 0.5;
	for (int octave = 0; octave < ${OCTAVES}; octave++) {
		sum += weight * noise(p);
		p = p * 2.03 + vec2(17.1, 9.3);
		weight *= 0.5;
	}
	return sum / ${(1 - 0.5 ** OCTAVES).toFixed(6)};
}

// Rundade bullar, en per ruta: 1 mitt i bullen och 0 utanför den.
float bumps(vec2 p) {
	vec2 home = floor(p);
	float nearest = 1.0;
	for (int row = -1; row <= 1; row++) {
		for (int column = -1; column <= 1; column++) {
			vec2 cell = home + vec2(float(column), float(row));
			vec2 centre = cell + 0.5 + 0.7 * (vec2(hash(cell + 3.1), hash(cell + 7.7)) - 0.5);
			float size = 0.75 + 0.35 * hash(cell + 13.5);
			nearest = min(nearest, length(p - centre) / size);
		}
	}
	return sqrt(max(0.0, 1.0 - nearest * nearest));
}

// Molntäckets yta som ett landskap: täckets täthet med bullar i två storlekar på.
float relief(vec2 p) {
	return density(p) + ${BIG.toFixed(2)} * bumps(p * ${BIG_BUMPS.toFixed(2)}) + ${SMALL.toFixed(2)} * bumps(p * ${SMALL_BUMPS.toFixed(2)} + 4.7);
}

void main() {
	// Pixeln tillbaka genom den stereografiska projektionen till en riktning på himlen.
	vec2 pixel = vec2(gl_FragCoord.x, height * ratio - gl_FragCoord.y) / ratio;
	vec2 mapped = vec2(pixel.x - translate.x, translate.y - pixel.y) / scale;
	float out2 = dot(mapped, mapped);
	vec3 seen = vec3(1.0 - out2, 2.0 * mapped.x, 2.0 * mapped.y) / (1.0 + out2);
	float forward = seen.x * altitude.x - seen.z * altitude.y;
	// Under horisonten ritas inget; det avgörs sist, eftersom linjernas bredd måste räknas ut
	// för alla pixlar för att bli rätt intill horisonten.
	float up = max(seen.x * altitude.y + seen.z * altitude.x, 0.0);
	float north = forward * azimuth.x - seen.y * azimuth.y;
	float east = forward * azimuth.y + seen.y * azimuth.x;
	// Riktningen förlängd till molntäckets plan: nära horisonten hamnar den långt bort.
	vec2 place = vec2(east, north) / (up + ${CURVATURE.toFixed(3)}) * ${SCALE.toFixed(3)} + drift;

	// Molnet är en platt, skarpt avgränsad form i tre toner, ljusare ju högre bullarna reser sig:
	// molnets kant, och två steg inåt som ger det volym. Stegen mäts också mot ytans hela spann,
	// så att ett heltäckande molntäcke fortfarande har former.
	float high = relief(place);
	float perPixel = max(fwidth(high), 1e-6);
	float edge = limit;
	float first = clamp((high - edge) / perPixel + 0.5, 0.0, 1.0);
	float second = clamp((high - max(edge + ${STEP.toFixed(2)}, ${MIDDLE.toFixed(2)})) / perPixel + 0.5, 0.0, 1.0);
	float third = clamp((high - max(edge + ${(STEP * 2.2).toFixed(2)}, ${TOP.toFixed(2)})) / perPixel + 0.5, 0.0, 1.0);
	float tone = ${TONES[0].toFixed(3)} * first + ${(TONES[1] - TONES[0]).toFixed(3)} * second + ${(TONES[2] - TONES[1]).toFixed(3)} * third;

	// Mot horisonten löses molnen upp.
	float clear = clamp(degrees(asin(clamp(up, 0.0, 1.0))) / ${HAZE_BELOW.toFixed(1)}, 0.0, 1.0);
	float alpha = tone * clear * shown;
	gl_FragColor = vec4(ink * alpha, alpha);
}`

// Samma yta i JavaScript, bara för att mäta hur höjden fördelar sig.
function hash(x: number, y: number) {
	let value = Math.imul(x, 374761393) + Math.imul(y, 668265263)
	value = Math.imul(value ^ (value >>> 13), 1274126177)
	return ((value ^ (value >>> 16)) >>> 0) / 4294967295
}
function noise(x: number, y: number) {
	const column = Math.floor(x)
	const row = Math.floor(y)
	const fx = x - column
	const fy = y - row
	const sx = fx * fx * (3 - 2 * fx)
	const sy = fy * fy * (3 - 2 * fy)
	const a = hash(column, row)
	const b = hash(column + 1, row)
	const c = hash(column, row + 1)
	const d = hash(column + 1, row + 1)
	return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy
}
function density(x: number, y: number) {
	let px = x + 0.9 * (noise(x * 0.8 + 11.3, y * 0.8 + 4.1) - 0.5)
	let py = y + 0.9 * (noise(x * 0.8 - 7.7, y * 0.8 + 23.9) - 0.5)
	let sum = 0
	let weight = 0.5
	for (let octave = 0; octave < OCTAVES; octave++) {
		sum += weight * noise(px, py)
		px = px * 2.03 + 17.1
		py = py * 2.03 + 9.3
		weight *= 0.5
	}
	return sum / (1 - 0.5 ** OCTAVES)
}
function bumps(x: number, y: number) {
	const homeX = Math.floor(x)
	const homeY = Math.floor(y)
	let nearest = 1
	for (let row = -1; row <= 1; row++) {
		for (let column = -1; column <= 1; column++) {
			const cellX = homeX + column
			const cellY = homeY + row
			const centreX = cellX + 0.5 + 0.7 * (hash(cellX + 3001, cellY) - 0.5)
			const centreY = cellY + 0.5 + 0.7 * (hash(cellX, cellY + 7001) - 0.5)
			const size = 0.75 + 0.35 * hash(cellX + 13001, cellY + 5)
			nearest = Math.min(nearest, Math.hypot(x - centreX, y - centreY) / size)
		}
	}
	return Math.sqrt(Math.max(0, 1 - nearest * nearest))
}
function relief(x: number, y: number) {
	return (
		density(x, y) +
		BIG * bumps(x * BIG_BUMPS, y * BIG_BUMPS) +
		SMALL * bumps(x * SMALL_BUMPS + 4.7, y * SMALL_BUMPS + 4.7)
	)
}

// Ytans höjd i ett stort antal punkter, i storleksordning: ur den läses vilken höjd som ska vara
// molnens kant för att en viss andel av himlen ska bli täckt.
let sorted: Float32Array | null = null
function threshold(cover: number) {
	if (!sorted) {
		sorted = new Float32Array(4096)
		for (let index = 0; index < sorted.length; index++) {
			sorted[index] = relief(hash(index, 1) * 400, hash(index, 2) * 400)
		}
		sorted.sort()
	}
	// Vid helt mulet ska ingen lucka bli kvar.
	if (cover > 0.97) return sorted[0] - OVERCAST_MARGIN
	return sorted[Math.min(sorted.length - 1, Math.floor((1 - cover) * sorted.length))]
}

// En färg som tre tal mellan 0 och 1, vad temat än skriver den som.
const colors = new Map<string, [number, number, number]>()
function channels(color: string) {
	let value = colors.get(color)
	if (!value) {
		const probe = document.createElement("canvas")
		probe.width = probe.height = 1
		const context = probe.getContext("2d", { willReadFrequently: true })!
		context.fillStyle = color
		context.fillRect(0, 0, 1, 1)
		const [r, g, b] = context.getImageData(0, 0, 1, 1).data
		value = [r / 255, g / 255, b / 255]
		colors.set(color, value)
	}
	return value
}

// Ytan grafikkortet ritar molnen på, och programmet som gör det. `false` om webbläsaren inte
// har det som behövs; då ritas inga moln.
type Stage = {
	canvas: HTMLCanvasElement
	gl: WebGLRenderingContext
	uniform: (name: string) => WebGLUniformLocation | null
}
let stage: Stage | false | null = null

function prepare(): Stage | false {
	const canvas = document.createElement("canvas")
	const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: false })
	// Linjernas bredd räknas ur hur fort deras läge ändras från pixel till pixel.
	if (!gl || !gl.getExtension("OES_standard_derivatives")) return false
	const program = gl.createProgram()!
	for (const [type, source] of [
		[gl.VERTEX_SHADER, VERTEX],
		[gl.FRAGMENT_SHADER, FRAGMENT],
	] as const) {
		const shader = gl.createShader(type)!
		gl.shaderSource(shader, source)
		gl.compileShader(shader)
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return false
		gl.attachShader(program, shader)
	}
	gl.linkProgram(program)
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return false
	gl.useProgram(program)
	// En enda triangel som täcker hela ytan.
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
	const corner = gl.getAttribLocation(program, "corner")
	gl.enableVertexAttribArray(corner)
	gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0)
	const locations = new Map<string, WebGLUniformLocation | null>()
	return {
		canvas,
		gl,
		uniform: name => {
			if (!locations.has(name)) locations.set(name, gl.getUniformLocation(program, name))
			return locations.get(name) ?? null
		},
	}
}

/** Molnen enligt prognosen för tidpunkten. Ritas inte utan prognos eller när himlen är klar. */
export function drawClouds({ context, projection, scene, view, width, height, ratio, ink, cloudsShown }: Pen) {
	const cover = scene.cloudCover
	if (cover === null || cover < 0.04 || cloudsShown < 0.01) return
	stage ??= prepare()
	if (!stage) return
	const { canvas, gl, uniform } = stage

	const pixelsWide = Math.round(width * ratio)
	const pixelsHigh = Math.round(height * ratio)
	if (canvas.width !== pixelsWide || canvas.height !== pixelsHigh) {
		canvas.width = pixelsWide
		canvas.height = pixelsHigh
	}
	gl.viewport(0, 0, pixelsWide, pixelsHigh)
	const [x, y] = projection.translate()
	gl.uniform2f(uniform("translate"), x, y)
	gl.uniform1f(uniform("scale"), projection.scale())
	gl.uniform1f(uniform("ratio"), ratio)
	gl.uniform1f(uniform("height"), height)
	gl.uniform2f(uniform("azimuth"), Math.cos(view.azimuth * RADIAN), Math.sin(view.azimuth * RADIAN))
	gl.uniform2f(uniform("altitude"), Math.cos(view.altitude * RADIAN), Math.sin(view.altitude * RADIAN))
	gl.uniform1f(uniform("limit"), threshold(cover))
	gl.uniform1f(uniform("shown"), cloudsShown)
	// Molnen flyttar sig med tiden. Talet hålls litet, så att grafikkortets precision räcker.
	const moved = ((scene.dial.time / 3_600_000) * DRIFT_PER_HOUR) % 2048
	gl.uniform2f(uniform("drift"), moved, moved * 0.4)
	gl.uniform3f(uniform("ink"), ...channels(ink))
	gl.clearColor(0, 0, 0, 0)
	gl.clear(gl.COLOR_BUFFER_BIT)
	gl.drawArrays(gl.TRIANGLES, 0, 3)

	// Lagret före kan ha lämnat ritytan halvgenomskinlig.
	context.save()
	context.globalAlpha = 1
	context.drawImage(canvas, 0, 0, width, height)
	context.restore()
}
