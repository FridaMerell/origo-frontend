import type { Metadata } from "next"
import SeasonLookup from "./season-lookup"

export const metadata: Metadata = {
	title: "Säsong för artlista | Tempus",
	description: "Importera en CSV med arter och se vilka som är i säsong.",
}

export default function SeasonLookupPage() {
	return (
		<article className='container py-5 max-sm:px-4 sm:py-7'>
			<header className='border-b border-border pb-4'>
				<h1 className='font-display text-3xl font-semibold tracking-tight sm:text-4xl'>
					Säsong för artlista
				</h1>
			</header>
			<SeasonLookup />
		</article>
	)
}
