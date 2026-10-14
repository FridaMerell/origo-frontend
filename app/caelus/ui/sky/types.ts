import type { Body } from "astronomy-engine"
import type { Aurora } from "./aurora"
import type { Shower } from "./meteors"

// public/caelus/data/stars.json: HYG:s stjärnor ljusare än magnitud 6,5, ljusast först.
export type StarRow = [
	ra: number,
	dec: number,
	magnitude: number,
	colorIndex: number | null,
	bayer: string,
	constellation: string,
	name: string,
]

// public/caelus/data/constellations.json (d3-celestial, IAU:s 88) och norse.json (Stellarium).
export type Constellation = {
	id: string
	name: string
	// Latinsk genitiv, för stjärnbeteckningar som "α Lyrae". Saknas i den nordiska filen.
	genitive?: string
	greek?: string
	rank: number
	at: [number, number]
	lines: [number, number][][]
}
export type NorseSky = {
	constellations: Constellation[]
	stars: { at: [number, number]; name: string }[]
}

// Det som hämtas innan kartan kan rita stjärnor och figurer.
export type Catalogue = {
	stars: StarRow[]
	constellations: Constellation[]
	norse: NorseSky
}

// En stjärnbilds teckning ur Hevelius atlas (1690), inpassad mot himlen: ett rutnät över bilden
// där varje nod har en plats på himlen. Från public/caelus/data/figures.json, som görs av
// caelus/data/make_figures.py i backend.
export type ArtFile = {
	image: string
	columns: number
	rows: number
	nodes: [number, number][]
}
export type Art = ArtFile & {
	picture: HTMLImageElement
	// Bilden med botten genomskinlig och sticket i kartans bläckfärg, gjord om när färgen byts.
	tinted: { ink: string; canvas: HTMLCanvasElement } | null
	// 0…1 från att bilden kom fram, så att den tonar in även om stjärnbilden redan pekades ut.
	arrived: number
}

export type Position = { latitude: number; longitude: number }

// En punkt på himlen sedd från platsen: [azimut i −180…180, höjd]. d3-geo får dem som
// longitud och latitud, så horisonten ligger vågrätt hur man än panorerar.
export type SkyPoint = [number, number]

export type Figure = {
	id: string
	// Namnet som står på kartan, och det andra namnet som visas bredvid när figuren pekas ut.
	name: string
	gloss: string
	rank: number
	at: SkyPoint
	lines: SkyPoint[][]
}

export type SceneStar = {
	// Radnumret i katalogen, som också är radnumret i star-details.json.
	index: number
	at: SkyPoint
	magnitude: number
	name: string
	letter: string
	constellation: string
	// Namnet hör till den valda himlen och tonar in tillsammans med dess figurer.
	fresh: boolean
}

// Det kalenderskivan behöver: dagen och klockslaget som ska stå vid visaren.
export type Dial = {
	// Tidpunkten, i millisekunder.
	time: number
	// Klockslaget i timmar, med minuterna som bråkdel; så långt är timringen vriden.
	hours: number
	// Årets dagar.
	days: { month: number; day: number }[]
	// Vilken av dagarna som är i dag; så långt är datumringen vriden.
	today: number
	// Dagarna då något ovanligt händer på himlen, som index i `days`.
	events: number[]
}

// Himlen från en plats vid en tidpunkt, färdig att projicera och rita.
export type Scene = {
	dial: Dial
	// Ljusast först, liksom katalogen.
	stars: SceneStar[]
	starByIndex: Map<number, SceneStar>
	figures: Figure[]
	graticule: SkyPoint[][]
	// Himlakropparna som är uppe. `lit` är hur stor del av månen som är upplyst (0…1).
	bodies: { body: Body; name: string; at: SkyPoint; lit?: number }[]
	// Solens läge också när den är nere, så att månens upplysta sida kan vändas mot den.
	sunAt: SkyPoint
	sunAltitude: number
	// Var norrsken kan synas vid tidpunktens Kp-index; null utan Kp eller när det inte syns.
	aurora: Aurora | null
	// Kp-index vid tidpunkten och platsen himlen gäller, så att kartan kan låta norrskenet glida
	// mellan två värden i stället för att hoppa.
	kp: number | null
	position: Position
	// Hur stor del av himlen som täcks av moln (0…1) enligt prognosen; null utan prognos.
	cloudCover: number | null
	// Meteorregnen som är aktiva vid tidpunkten.
	showers: Shower[]
	// Vintergatans nivåer, den svagaste först; varje nivå är polygoner av ringar. Räknas ut
	// första gången den behövs, eftersom den inte ritas utzoomat. Tom tills konturen hämtats.
	milkyWay: () => SkyPoint[][][][]
	// Från rektascension och deklination (J2000, grader) till en punkt på den här himlen.
	toSky: (equatorial: [number, number]) => SkyPoint
	// Stjärnbilden vars område en punkt ligger i, enligt IAU:s gränser. Saknas för den nordiska
	// himlen, vars figurer inte har några gränser.
	figureAt: ((at: SkyPoint) => string) | null
}

// Blickriktningen och förstoringen.
export type View = { azimuth: number; altitude: number; zoom: number }

// Hur mycket en figur är framlyft just nu (0…1), av pekaren respektive av att vara vald.
// Nivåerna glider mot sina mål, så att framlyftningen både kommer och går mjukt.
export type Level = { hover: number; select: number }
