import { useSyncExternalStore } from "react"

// Riktningen telefonen pekar åt: bakkamerans riktning som azimut (från norr, medurs) och höjd.
export type Direction = { azimuth: number; altitude: number }

type Vector = [number, number, number]

// Hur mycket varje ny mätning väger mot de tidigare. Givarna darrar; lägre ger lugnare himmel
// men längre eftersläpning.
const SMOOTHING = 0.25

// iOS ger riktningen mot norr i en egen egenskap och sin vinkel `alpha` från en godtycklig start.
type CompassEvent = DeviceOrientationEvent & { webkitCompassHeading?: number }
type PermissionRequest = { requestPermission?: () => Promise<"granted" | "denied"> }

/**
 * Om webbläsaren alls kan tala om hur enheten hålls, och enheten styrs med fingret. Falskt under
 * serverrenderingen och den första bilden, så att sidan ser ut som den servern skickade.
 */
export function useCanFollow() {
	return useSyncExternalStore(
		() => () => {},
		() => "DeviceOrientationEvent" in window && window.matchMedia("(pointer: coarse)").matches,
		() => false,
	)
}

// Skärmens vridning i grader: 0 på höjden, 90 eller 270 på bredden.
function screenAngle() {
	const angle = screen.orientation?.angle ?? (window as { orientation?: number }).orientation ?? 0
	return (angle * Math.PI) / 180
}

/**
 * Bakkamerans riktning och skärmens uppåt i en ram med x mot öster, y mot norr och z uppåt,
 * ur enhetens vinklar (W3C: alpha kring z, beta kring x, gamma kring y, i den ordningen).
 */
function axes(alpha: number, beta: number, gamma: number): { camera: Vector; up: Vector } {
	const radians = Math.PI / 180
	const [sa, ca] = [Math.sin(alpha * radians), Math.cos(alpha * radians)]
	const [sb, cb] = [Math.sin(beta * radians), Math.cos(beta * radians)]
	const [sg, cg] = [Math.sin(gamma * radians), Math.cos(gamma * radians)]
	// Enhetens egna axlar i jordens ram: x åt höger, y mot överkanten, z ut ur skärmen.
	const x: Vector = [ca * cg - sa * sb * sg, sa * cg + ca * sb * sg, -cb * sg]
	const y: Vector = [-sa * cb, ca * cb, sb]
	const z: Vector = [ca * sg + sa * sb * cg, sa * sg - ca * sb * cg, cb * cg]
	// Kameran tittar ut genom baksidan. Uppåt på skärmen är enhetens överkant, eller en sida när
	// skärmen är vriden på bredden.
	const turn = screenAngle()
	const [st, ct] = [Math.sin(turn), Math.cos(turn)]
	return {
		camera: [-z[0], -z[1], -z[2]],
		up: [ct * y[0] + st * x[0], ct * y[1] + st * x[1], ct * y[2] + st * x[2]],
	}
}

// Blicken ur kamerans riktning. Azimuten tas ur kamerans riktning längs marken, men ju brantare
// den pekar desto mer ur skärmens nederkant, så att den inte snurrar när man ser rakt upp eller
// ner: där är det nederkanten som visar vilket håll man står vänd åt.
function directionOf(camera: Vector, up: Vector): Direction {
	const lift = camera[2]
	const east = camera[0] - lift * up[0]
	const north = camera[1] - lift * up[1]
	return {
		azimuth: ((Math.atan2(east, north) * 180) / Math.PI + 360) % 360,
		altitude: (Math.asin(Math.max(-1, Math.min(1, lift))) * 180) / Math.PI,
	}
}

function blend(from: Vector | null, to: Vector): Vector {
	if (!from) return to
	return [
		from[0] + (to[0] - from[0]) * SMOOTHING,
		from[1] + (to[1] - from[1]) * SMOOTHING,
		from[2] + (to[2] - from[2]) * SMOOTHING,
	]
}

// Om kartan följer telefonen, och varför den slutade om något gick fel. Delas av menyn, som
// slår på och av, och kartan, som vänder blicken. Sparas inte: lovet att läsa givarna måste
// begäras i ett tryck, så följningen kan inte börja av sig själv när sidan öppnas.
let state: { on: boolean; error: string | null } = { on: false, error: null }
let stop: (() => void) | null = null
const stateListeners = new Set<() => void>()
const directionListeners = new Set<(direction: Direction | null) => void>()

function setState(next: typeof state) {
	state = next
	for (const listener of stateListeners) listener()
}

/** Slutar följa telefonen, med ett fel att visa om den slutade av sig själv. */
export function stopFollowing(error: string | null = null) {
	if (!state.on && error === state.error) return
	stop?.()
	stop = null
	setState({ on: false, error })
	for (const listener of directionListeners) listener(null)
}

/** Slår på eller av följningen. Måste anropas direkt i ett tryck, för iOS skull. */
export function toggleFollowing() {
	if (state.on) {
		stopFollowing()
		return
	}
	setState({ on: true, error: null })
	stop = followDevice(
		direction => {
			for (const listener of directionListeners) listener(direction)
		},
		message => stopFollowing(message),
	)
}

/** Om kartan följer telefonen, och felet om den slutade av sig själv. */
export function useFollowing() {
	return useSyncExternalStore(
		listener => {
			stateListeners.add(listener)
			return () => stateListeners.delete(listener)
		},
		() => state,
		() => state,
	)
}

/** Får telefonens riktning medan den följs, och null när följningen slutar. */
export function onDeviceDirection(listener: (direction: Direction | null) => void) {
	directionListeners.add(listener)
	return () => {
		directionListeners.delete(listener)
	}
}

/**
 * Ber om lov att läsa givarna (iOS kräver det, och bara direkt efter ett tryck) och följer
 * sedan telefonen. `onFail` anropas om lov nekas eller om ingen riktning mot norr kommer inom
 * en sekund. Returnerar en funktion som slutar följa.
 */
function followDevice(onDirection: (direction: Direction) => void, onFail: (message: string) => void) {
	let stopped = false
	let camera: Vector | null = null
	let up: Vector | null = null
	let heard = false

	// Android ger vinklar mot norr i en egen händelse; iOS i den vanliga, med kompassriktningen
	// bredvid. Annars är `alpha` mot norr bara om händelsen säger det.
	const absoluteEvent = "ondeviceorientationabsolute" in window
	const type = absoluteEvent ? "deviceorientationabsolute" : "deviceorientation"

	const onOrientation = (event: Event) => {
		const { alpha, beta, gamma, absolute, webkitCompassHeading } = event as CompassEvent
		if (beta === null || gamma === null) return
		const north =
			typeof webkitCompassHeading === "number" && webkitCompassHeading >= 0
				? 360 - webkitCompassHeading
				: alpha !== null && (absoluteEvent || absolute)
					? alpha
					: null
		if (north === null) return
		heard = true
		const next = axes(north, beta, gamma)
		camera = blend(camera, next.camera)
		up = blend(up, next.up)
		onDirection(directionOf(camera, up))
	}

	const listen = () => {
		if (stopped) return
		window.addEventListener(type, onOrientation)
		window.setTimeout(() => {
			if (!stopped && !heard) onFail("Telefonen talar inte om åt vilket håll den pekar.")
		}, 1000)
	}

	const request = (DeviceOrientationEvent as unknown as PermissionRequest).requestPermission
	if (request) {
		request()
			.then(state => (state === "granted" ? listen() : onFail("Rörelsegivarna får inte läsas.")))
			.catch(() => onFail("Rörelsegivarna får inte läsas."))
	} else {
		listen()
	}

	return () => {
		stopped = true
		window.removeEventListener(type, onOrientation)
	}
}
