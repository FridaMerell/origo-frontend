import { sharedOrigoJson } from "@/app/lib/api-client"

// Ett årligt meteorregn: radiant, aktivitet och hastighet från IAU:s Meteor Data Center, ZHR
// från IMO:s kalender (se caelus/services/iau_mdc.py i backend). Maximum, början och slut är
// solens longitud (grader, J2000); början och slut saknas när ingen lösning anger dem. Radiantens
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
