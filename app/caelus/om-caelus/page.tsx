import type { Metadata } from "next"
import type { ReactNode } from "react"
import { TENANTS } from "@/app/lib/tenant"

export const metadata: Metadata = {
	title: `Om | ${TENANTS.caelus.name}`,
	description: "Källor till Caelus.",
}

type Source = { name: string; href: string; note: string }

// Det kartan visar, och varifrån det kommer.
const SECTIONS: { title: string; text: string; sources: Source[] }[] = [
	{
		title: "Stjärnorna",
		text: "Stjärnor ljusare än magnitud 6,5, med namn, Bayerbeteckningar och övriga uppgifter.",
		sources: [
			{ name: "HYG Database v4.1", href: "https://www.astronexus.com/projects/hyg", note: "David Nash, astronexus. CC BY-SA 4.0" },
		],
	},
	{
		title: "Stjärnbilderna",
		text: "Linjer och namn för IAU:s 88 stjärnbilder. Gränserna är IAU:s. Figurer och namn för den nordiska himlen från Stellarium.",
		sources: [
			{ name: "d3-celestial", href: "https://github.com/ofrohn/d3-celestial", note: "Olaf Frohn. BSD-3-Clause" },
			{ name: "Stellarium, nordisk himmel", href: "https://stellarium.org", note: "Jonas Persson. CC BY-SA" },
		],
	},
	{
		title: "Teckningarna",
		text: "Johannes Hevelius, Firmamentum Sobiescianum, 1690.",
		sources: [
			{
				name: "Hevelius himmel för Stellarium",
				href: "https://www.wilmslowastro.com",
				note: "Mark Crossley. Skanningar: US Naval Observatory, STScI, Polona. Fri från upphovsrätt",
			},
		],
	},
	{
		title: "Vintergatan",
		text: "Kontur i fem nivåer.",
		sources: [{ name: "d3-celestial", href: "https://github.com/ofrohn/d3-celestial", note: "Olaf Frohn. BSD-3-Clause" }],
	},
	{
		title: "Solen, månen och planeterna",
		text: "Positioner, månfas och skymning beräknas lokalt. Stereografisk projektion.",
		sources: [
			{ name: "Astronomy Engine", href: "https://github.com/cosinekitty/astronomy", note: "Don Cross. MIT" },
			{ name: "d3-geo", href: "https://github.com/d3/d3-geo", note: "Mike Bostock. ISC" },
		],
	},
	{
		title: "Händelser",
		text: "Fullmånar, förmörkelser, dagjämningar, solstånd, oppositioner och största elongationer beräknas för platsen. Supermåne: fullmåne närmare än 360 000 km. Blå måne: andra fullmånen i samma kalendermånad. Förmörkelser bara om de syns från platsen.",
		sources: [{ name: "Astronomy Engine", href: "https://github.com/cosinekitty/astronomy", note: "Don Cross. MIT" }],
	},
	{
		title: "Meteorregn",
		text: "Radiant, drift, hastighet, aktivitetsperiod och maximum från IAU:s lista över etablerade meteorregn. ZHR från IMO. Meteorerna på kartan visas tätare än verklig frekvens.",
		sources: [
			{
				name: "IAU Meteor Data Center",
				href: "https://www.ta3.sk/IAUC22DB/MDC2022/",
				note: "Etablerade meteorregn",
			},
			{
				name: "IMO Meteor Shower Calendar 2026",
				href: "https://www.imo.net/resources/calendar/",
				note: "International Meteor Organization, Jürgen Rendtel",
			},
		],
	},
	{
		title: "Norrsken",
		text: "Planetärt Kp-index, uppmätt och prognos, i tretimmarsperioder.",
		sources: [
			{
				name: "NOAA Space Weather Prediction Center",
				href: "https://www.swpc.noaa.gov/products/planetary-k-index",
				note: "Planetärt K-index",
			},
		],
	},
	{
		title: "Moln",
		text: "Total molnighet ur SMHI:s punktprognos för platsen.",
		sources: [
			{
				name: "SMHI öppna data, SNOW1g",
				href: "https://opendata.smhi.se",
				note: "Sveriges meteorologiska och hydrologiska institut. CC BY 4.0",
			},
		],
	},
]

function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section className='border-t border-text pt-6'>
			<h2 className='font-display text-2xl italic text-text'>{title}</h2>
			{children}
		</section>
	)
}

/** Om Caelus: källorna. */
export default function CaelusAboutPage() {
	return (
		<main className='px-6 pb-12 pt-16 sm:px-12'>
			<div className='mx-auto flex max-w-2xl flex-col gap-8'>
				<h1 className='font-display text-3xl font-medium italic text-text'>Om Caelus</h1>
				{SECTIONS.map(section => (
					<Section key={section.title} title={section.title}>
						<p className='mt-2 text-lg text-text'>{section.text}</p>
						<ul className='mt-3 flex flex-col gap-1 text-base'>
							{section.sources.map(source => (
								<li key={source.name}>
									<a
										href={source.href}
										target='_blank'
										rel='noreferrer'
										className='text-text underline underline-offset-4 hover:text-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring'>
										{source.name}
									</a>
									<span className='italic text-text-muted'> · {source.note}</span>
								</li>
							))}
						</ul>
					</Section>
				))}
			</div>
		</main>
	)
}
