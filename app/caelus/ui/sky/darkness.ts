import { Body, Illumination } from "astronomy-engine"
import type { PanelInfo } from "../InfoPanel"
import { describeCloudCover } from "./clouds"
import { formatTime, formatWeekdayDate } from "@/app/lib/formatters"
import type { Scene } from "./types"

/*
 * Hur goda förutsättningarna är för att se stjärnor vid en tidpunkt: himlens mörker (solens
 * höjd), månljuset och molnen, vägda till ett betyg i fyra steg. Ljusföroreningar räknas inte.
 */


// Hur mycket ett fullt upplyst månljus i zenit tar av mörkret.
const MOON_WEIGHT = 0.9

const VERDICTS: [least: number, verdict: string][] = [
	[0.75, "Mycket goda förutsättningar"],
	[0.5, "Goda förutsättningar"],
	[0.25, "Måttliga förutsättningar"],
	[0, "Dåliga förutsättningar"],
]

/** Skymningens stadium, med de vanliga gränserna för solens höjd. */
export function twilightStage(sunAltitude: number) {
	if (sunAltitude > 0) return "Solen är uppe"
	if (sunAltitude > -6) return "Borgerlig skymning"
	if (sunAltitude > -12) return "Nautisk skymning"
	if (sunAltitude > -18) return "Astronomisk skymning"
	return "Mörkt"
}

export type Darkness = {
	verdict: string
	sunAltitude: number
	// Månens höjd och den upplysta andelen, 0…1.
	moonAltitude: number
	moonLit: number
	// Molnigheten 0…1, null utan prognos för tidpunkten.
	cloudCover: number | null
}

/** Betyget av de enskilda värdena. Utan molnprognos räknas det på mörkret och månen. */
export function rateDarkness(sunAltitude: number, moonAltitude: number, moonLit: number, cloudCover: number | null) {
	// 0 när solen står högre än −6°, 1 när den är under −18°, jämnt däremellan.
	const sky = Math.min(1, Math.max(0, (-6 - sunAltitude) / 12))
	// Månljuset växer med den upplysta andelen och med höjden; redan en lågt stående måne lyser
	// upp himlen, därför roten ur höjdens sinus.
	const moonlight = moonAltitude > 0 ? moonLit * Math.sqrt(Math.sin((moonAltitude * Math.PI) / 180)) : 0
	const moon = 1 - MOON_WEIGHT * moonlight
	const clouds = cloudCover === null ? 1 : 1 - cloudCover
	const score = sky * moon * clouds
	// Stegets nummer, 0 för det bästa, så att tider med samma betyg kan jämföras.
	const step = VERDICTS.findIndex(([least]) => score >= least)
	return { score, step, verdict: VERDICTS[step][1] }
}

/** Förutsättningarna vid scenens tid. */
export function darknessAt(scene: Scene, time: Date): Darkness {
	const { sunAltitude, cloudCover } = scene
	const moonAltitude = scene.allBodies.find(item => item.body === Body.Moon)?.at[1] ?? -90
	const moonLit = Illumination(Body.Moon, time).phase_fraction
	const { verdict } = rateDarkness(sunAltitude, moonAltitude, moonLit, cloudCover)
	return { verdict, sunAltitude, moonAltitude, moonLit, cloudCover }
}

function degrees(value: number) {
	// `|| 0` så att −0,4 blir 0° och inte −0°.
	return `${(Math.round(value) || 0).toLocaleString("sv-SE")}°`
}

/** Panelens innehåll. `hasForecast` säger om SMHI har någon prognos alls för platsen. */
export function darknessInfo(darkness: Darkness, time: Date, hasForecast: boolean): PanelInfo {
	const day = formatWeekdayDate(time)
	const { sunAltitude, moonAltitude, moonLit, cloudCover } = darkness
	return {
		key: "darkness",
		label: "Förutsättningar",
		title: "Förutsättningar",
		subtitle: `${day.charAt(0).toUpperCase()}${day.slice(1)} · ${formatTime(time)}`,
		rows: [
			["Betyg", darkness.verdict],
			[
				"Himlen",
				sunAltitude > 0
					? `Solen är uppe, ${degrees(sunAltitude)} över horisonten`
					: `${twilightStage(sunAltitude)}, solen ${degrees(-sunAltitude)} under horisonten`,
			],
			[
				"Månen",
				moonAltitude > 0
					? `${Math.round(moonLit * 100)} % upplyst, ${degrees(moonAltitude)} över horisonten`
					: "Under horisonten",
			],
			[
				"Moln",
				cloudCover !== null
					? `${describeCloudCover(cloudCover)}, enligt SMHI`
					: hasForecast
						? "Ingen prognos för den tiden"
						: "Ingen molnprognos för platsen",
			],
		],
		note: "Ljusföroreningar räknas inte.",
	}
}
