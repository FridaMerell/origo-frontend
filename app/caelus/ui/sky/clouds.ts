import type { Position } from "./types"

/*
 * Molnighet ur SMHI:s öppna punktprognos (SNOW1g): hur stor del av himlen som täcks av moln över
 * en plats, timme för timme de närmaste dygnen och glesare därefter, omkring tio dygn framåt.
 * Prognosen gäller närmaste punkt i ett rutnät på 2,5 km och täcker Norden; utanför det svarar
 * SMHI 404. Tjänsten kräver ingen nyckel och får anropas direkt från webbläsaren.
 */

const FORECAST_URL =
	"https://opendata-download-metfcst.smhi.se/api/category/snow1g/version/1/geotype/point"
// SMHI:s platshållare för ett värde som saknas.
const MISSING = 9999

// Molnigheten vid en tidpunkt, som andel av himlen (0 klart, 1 mulet).
export type CloudStep = { time: number; cover: number }

/** Hämtar prognosen för en plats. Tom utanför prognosområdet. */
export async function fetchCloudCover({ latitude, longitude }: Position): Promise<CloudStep[]> {
	// Två decimaler, ungefär en kilometer, är finare än rutnätet.
	const response = await fetch(
		`${FORECAST_URL}/lon/${longitude.toFixed(2)}/lat/${latitude.toFixed(2)}/data.json?parameters=cloud_area_fraction`,
	)
	if (response.status === 404) return []
	if (!response.ok) throw new Error(`SMHI svarade ${response.status}`)
	const payload: { timeSeries?: { time: string; data?: { cloud_area_fraction?: number } }[] } = await response.json()
	return (payload.timeSeries ?? [])
		.map(step => ({ time: Date.parse(step.time), octas: step.data?.cloud_area_fraction }))
		.filter((step): step is { time: number; octas: number } => Number.isFinite(step.octas) && step.octas !== MISSING)
		.map(({ time, octas }) => ({ time, cover: Math.min(1, Math.max(0, octas / 8)) }))
}

/**
 * Molnigheten vid en tidpunkt, jämnt mellan prognosens steg så att molnen växer och krymper
 * mjukt när tiden vrids. Null före och efter prognosen.
 */
export function cloudCoverAt(steps: CloudStep[], time: Date | null) {
	if (!time || steps.length === 0) return null
	const at = time.getTime()
	const next = steps.findIndex(step => step.time >= at)
	if (next === -1) return null
	// Före första steget gäller det bara om tidpunkten ligger i dess timme.
	if (next === 0) return steps[0].time - at <= 3_600_000 ? steps[0].cover : null
	const from = steps[next - 1]
	const to = steps[next]
	return from.cover + ((to.cover - from.cover) * (at - from.time)) / (to.time - from.time)
}

/** Molnigheten i ord, med SMHI:s indelning i åttondelar. */
export function describeCloudCover(cover: number) {
	const octas = Math.round(cover * 8)
	if (octas === 0) return "Klart"
	if (octas <= 2) return "Mest klart"
	if (octas <= 5) return "Halvklart"
	if (octas <= 7) return "Mycket moln"
	return "Mulet"
}
