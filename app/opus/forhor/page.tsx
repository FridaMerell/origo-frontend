import { Metadata } from "next"
import Link from "next/link"
import { listEntryLanguages } from "../_actions/lexical-entry-actions"
import { languageName } from "../ordlistor/lexical-forms"

export const metadata: Metadata = {
	title: "Glosförhör | Origo Opus",
	description: "Välj ett språk att förhöra dig på",
}

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"

/** Språken bland ens egna ord; ett klick startar ett förhör på det språket. */
export default async function QuizLanguagesPage() {
	const languages = await listEntryLanguages().catch(() => [])

	return (
		<>
			<h1 className='font-display text-3xl font-bold text-text'>Glosförhör</h1>
			<p className='mt-2 text-text-muted'>Välj ett språk att förhöra dig på.</p>

			{languages.length === 0 ? (
				<p className='my-10 text-center font-display text-lg text-text-muted'>
					Du har inga ord än. Markera ett ord i en text och skriv en definition, eller lägg till ord i en{" "}
					<Link href='/ordlistor' className={`rounded-sm text-primary underline underline-offset-4 hover:text-text ${FOCUS}`}>
						ordlista
					</Link>
					.
				</p>
			) : (
				<ul className='mt-6 flex flex-col border-t border-border'>
					{languages.map(item => (
						<li key={item.language} className='border-b border-border'>
							<Link
								href={`/forhor/${encodeURIComponent(item.language)}`}
								className={`group flex items-baseline justify-between gap-4 rounded-sm py-4 ${FOCUS}`}>
								<span className='font-display text-xl font-semibold text-text group-hover:text-primary'>
									{languageName(item.language)}
								</span>
								<span className='shrink-0 text-sm text-text-muted oldstyle-nums'>
								{item.count} ord{item.marked > 0 && `, ${item.marked} markerade för förhör`}
							</span>
							</Link>
						</li>
					))}
				</ul>
			)}
		</>
	)
}
