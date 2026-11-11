import { sharedOrigoJson } from "@/app/lib/api-client"

// Ett årligt meteorregn: aktivitet, maximum, radiant, hastighet och ZHR från årets kalender från
// IMO, radiantens vandring från IAU:s Meteor Data Center (se caelus/services/imo.py och
// iau_mdc.py i backend). Maximum, början och slut är solens longitud (grader, J2000). Radiantens
// vandring är grader per grad av solens longitud.
export type MeteorShower = {
	code: string
	name: string
	peak: number
	start: number | null
	end: number | null
	ra: number
	dec: number
	ra_drift: number
	dec_drift: number
	speed: number
	zhr: number
}

// Listan är densamma för alla och ändras några gånger om året.
const readShared = sharedOrigoJson({ revalidate: 60 * 60 * 24 })

/** Meteorregnen, eller en tom lista om backend inte kunde hämta dem. */
export async function getMeteorShowers(): Promise<MeteorShower[]> {
	const payload = await readShared("/api/caelus/meteor-showers/")
	return Array.isArray(payload) ? (payload as MeteorShower[]) : []
}
