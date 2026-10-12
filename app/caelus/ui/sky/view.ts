import { geoStereographic } from "d3-geo"
import type { View } from "./types"

// Blicken när kartan öppnas: mot söder. Höjden sätts efter skärmens form när kartan mätts.
export const START_VIEW: View = { azimuth: 180, altitude: 38, zoom: 1 }
// Längst ut ryms hela himlen på kartan när man ser rakt upp, med kalenderskivans ringar runt om
// och en marginal till ramen: skivan tar då ungefär 92 % av kartans kortaste sida.
export const ZOOM_EXTENT: [number, number] = [0.33, 12]

// Hur mycket kalenderskivans ringar syns (0…1): de tonar in medan de kommer in i bild, och är
// helt framme när de ryms på kartan.
export function dialShownAt(zoom: number) {
	return ease((0.45 - zoom) / 0.08)
}

export function ease(linear: number) {
	const clamped = Math.min(1, Math.max(0, linear))
	return clamped * clamped * (3 - 2 * clamped)
}

// Skalan vid zoom 1: synfältet är ungefär 110° över kartans kortaste sida.
export function baseScale(width: number, height: number) {
	return Math.min(width, height) / 1.04
}

// Hur många grader på himlen en pixel motsvarar mitt i kartan.
export function degreesPerPixel(width: number, height: number, zoom: number) {
	return 114.6 / (baseScale(width, height) * zoom)
}

// Hur långt upp på kartan horisonten rakt fram får lyftas när man lutar blicken nedåt, som
// andel av kartans höjd räknat från nederkanten. Längre än så visar mest tom mark.
const TILT = 0.3

// Den lägsta höjd blicken får ha: där horisonten rakt fram ligger en bit upp på kartan. Med
// `opening` i stället strax ovanför nederkanten, där kartan öppnas. När man zoomar ut höjs
// blicken av sig själv tills hela himlen ligger mitt på kartan.
export function lowestAltitude(width: number, height: number, zoom: number, opening = false) {
	const margin = opening ? 48 : Math.max(48, height * TILT)
	const lift = (2 * Math.atan((height / 2 - margin) / (baseScale(width, height) * zoom)) * 180) / Math.PI
	// Längst ut ska blicken gå rakt upp, så att himlens rundel hamnar mitt på kartan.
	const overhead = 90 * ease((0.85 - zoom) / 0.25)
	return Math.min(90, Math.max(0, lift, overhead))
}

// Hur detaljerad kartan är: 1 när himlen ritas i ungefär den skala en skrivbordsskärm ger vid
// zoom 1. Styr hur många stjärnor, bokstäver och namn som får plats, så att en liten skärm
// inte får lika mycket text som en stor.
export function detailOf(view: View, width: number, height: number) {
	return (baseScale(width, height) * view.zoom) / 600
}

// Den svagaste stjärnan som ritas vid en viss detaljnivå.
export function starLimitAt(detail: number) {
	return Math.min(6.5, Math.max(4.4, 5 + Math.log2(detail)))
}

// Stereografisk projektion kring blickriktningen. Punkter långt bakom betraktaren klipps bort,
// men aldrig närmare än att klippkanten hamnar utanför kartan: annars syns den som en egen
// båge när man zoomar ut, och marken når inte ända ut i hörnen.
export function makeProjection(view: View, width: number, height: number) {
	const scale = baseScale(width, height) * view.zoom
	const corner = Math.hypot(width, height) / 2
	const reach = (2 * Math.atan(corner / scale) * 180) / Math.PI + 4
	return geoStereographic()
		.scale(scale)
		.translate([width / 2, height / 2])
		.rotate([-view.azimuth, -view.altitude])
		.clipAngle(Math.min(172, Math.max(110, reach)))
		.precision(0.3)
}
