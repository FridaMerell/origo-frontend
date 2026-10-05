import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getGlossary } from "../../../_actions/glossary-actions"
import QuizView from "../../../forhor/QuizView"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
	const { id } = await params
	const glossary = await getGlossary(Number(id)).catch(() => null)
	return {
		title: `Glosförhör: ${glossary?.title ?? "Ordlistan finns inte"} | Origo Opus`,
		description: "Glosförhör på orden i en ordlista",
	}
}

export default async function GlossaryQuizPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const glossary = await getGlossary(Number(id)).catch(() => null)
	if (!glossary) notFound()
	return (
		<QuizView
			source={{ kind: "glossary", id: glossary.id }}
			scope={`ur ${glossary.title}`}
			entryCount={glossary.entries.length}
			back={{ href: `/ordlistor/${glossary.id}`, label: glossary.title }}
		/>
	)
}
