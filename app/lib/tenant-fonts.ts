import { Cormorant_Garamond, Fraunces, IBM_Plex_Mono, Karla, PT_Serif, Petrona, Source_Serif_4, Space_Grotesk } from "next/font/google"
import type { TenantId } from "./tenant"

// Each app's typefaces (app/styles/tokens/typography.css), as the classes that
// define their CSS variables. They sit on the app's root element, so drawers
// portaled into the theme scope inherit them too. Declared here once, because
// the root loading screen shows an app's splash before its layout has rendered.
const petrona = Petrona({
	variable: "--font-petrona",
	subsets: ["latin", "latin-ext"],
	display: "swap",
	preload: false,
})
const karla = Karla({
	variable: "--font-karla",
	subsets: ["latin", "latin-ext"],
	display: "swap",
	preload: false,
})
const plexMono = IBM_Plex_Mono({
	variable: "--font-plex-mono",
	subsets: ["latin", "latin-ext"],
	weight: ["400", "500"],
	display: "swap",
	preload: false,
})
const sourceSerif = Source_Serif_4({
	variable: "--font-source-serif",
	subsets: ["latin", "latin-ext"],
	axes: ["opsz"],
	display: "swap",
	preload: false,
})
const ptSerif = PT_Serif({
	variable: "--font-pt-serif",
	subsets: ["latin", "latin-ext"],
	weight: ["400", "700"],
	style: ["normal", "italic"],
	display: "swap",
	preload: false,
})
const fraunces = Fraunces({
	variable: "--font-opus-fraunces",
	subsets: ["latin"],
	style: ["normal", "italic"],
	axes: ["opsz"],
	display: "swap",
})
const spaceGrotesk = Space_Grotesk({
	variable: "--font-opus-space-grotesk",
	subsets: ["latin"],
	display: "swap",
})
const cormorant = Cormorant_Garamond({
	variable: "--font-caelus-cormorant",
	subsets: ["latin", "latin-ext"],
	weight: ["400", "500", "600"],
	style: ["normal", "italic"],
	display: "swap",
})

export const TENANT_FONTS: Record<TenantId, string> = {
	verso: `${petrona.variable} ${karla.variable} ${plexMono.variable}`,
	flux: "",
	tempus: `${petrona.variable} ${karla.variable} ${plexMono.variable}`,
	apsis: `${sourceSerif.variable} ${ptSerif.variable} ${plexMono.variable}`,
	opus: `${fraunces.variable} ${spaceGrotesk.variable}`,
	caelus: cormorant.variable,
}
