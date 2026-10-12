// Vilken himmel kartan visar: vilka figurer som ritas och vad de heter.
export type SkyCulture = "norse" | "swedish" | "latin" | "greek"

export const SKY_CULTURES: { id: SkyCulture; label: string }[] = [
	{ id: "norse", label: "Nordisk" },
	{ id: "swedish", label: "Svensk" },
	{ id: "latin", label: "Latinsk" },
	{ id: "greek", label: "Grekisk" },
]

// De 88 stjärnbildernas svenska namn, efter IAU:s förkortning.
export const SWEDISH_NAMES: Record<string, string> = {
	And: "Andromeda", Ant: "Luftpumpen", Aps: "Paradisfågeln", Aqr: "Vattumannen",
	Aql: "Örnen", Ara: "Altaret", Ari: "Väduren", Aur: "Kusken", Boo: "Björnvaktaren",
	Cae: "Gravstickeln", Cam: "Giraffen", Cnc: "Kräftan", CVn: "Jakthundarna",
	CMa: "Stora hunden", CMi: "Lilla hunden", Cap: "Stenbocken", Car: "Kölen",
	Cas: "Cassiopeja", Cen: "Kentauren", Cep: "Cepheus", Cet: "Valfisken",
	Cha: "Kameleonten", Cir: "Cirkelpassaren", Col: "Duvan", Com: "Berenikes hår",
	CrA: "Södra kronan", CrB: "Norra kronan", Crv: "Korpen", Crt: "Bägaren",
	Cru: "Södra korset", Cyg: "Svanen", Del: "Delfinen", Dor: "Svärdfisken", Dra: "Draken",
	Equ: "Lilla hästen", Eri: "Floden Eridanus", For: "Ugnen", Gem: "Tvillingarna",
	Gru: "Tranan", Her: "Herkules", Hor: "Pendeluret", Hya: "Vattenormen",
	Hyi: "Lilla vattenormen", Ind: "Indianen", Lac: "Ödlan", Leo: "Lejonet",
	LMi: "Lilla lejonet", Lep: "Haren", Lib: "Vågen", Lup: "Vargen", Lyn: "Lodjuret",
	Lyr: "Lyran", Men: "Taffelberget", Mic: "Mikroskopet", Mon: "Enhörningen",
	Mus: "Flugan", Nor: "Vinkelhaken", Oct: "Oktanten", Oph: "Ormbäraren", Ori: "Orion",
	Pav: "Påfågeln", Peg: "Pegasus", Per: "Perseus", Phe: "Fenix", Pic: "Målaren",
	Psc: "Fiskarna", PsA: "Södra fisken", Pup: "Akterskeppet", Pyx: "Kompassen",
	Ret: "Rombiska nätet", Sge: "Pilen", Sgr: "Skytten", Sco: "Skorpionen",
	Scl: "Bildhuggaren", Sct: "Skölden", Ser: "Ormen", Sex: "Sextanten", Tau: "Oxen",
	Tel: "Kikaren", Tri: "Triangeln", TrA: "Södra triangeln", Tuc: "Tukanen",
	UMa: "Stora björnen", UMi: "Lilla björnen", Vel: "Seglet", Vir: "Jungfrun",
	Vol: "Flygfisken", Vul: "Räven",
}

// Stellariums nordiska himmel anger bara engelska översättningar i sin datafil; de fornnordiska
// namnen står i dess beskrivning. Nyckeln är figurens nummer i public/caelus/norse.json.
export const NORSE_NAMES: Record<string, { name: string; gloss: string }> = {
	"001": { name: "Aurvandils tá", gloss: "Aurvandils tå" },
	"002": { name: "Ulfs keptr", gloss: "Ulvens gap" },
	"003": { name: "Fiskikarlar", gloss: "Fiskarna" },
	"004": { name: "Kvennavagn", gloss: "Kvinnovagnen" },
	"005": { name: "Karlvagn", gloss: "Karlavagnen" },
	"006": { name: "Ásar bardagi", gloss: "Asarnas stridsfält" },
}

// Stjärnnamnen i samma källa, efter dess engelska översättning.
export const NORSE_STAR_NAMES: Record<string, string> = {
	"Guide Star": "Leiðarstjarna",
	"Day Star": "Dagstjarna",
	"South Star": "Suðrstjarna",
}
