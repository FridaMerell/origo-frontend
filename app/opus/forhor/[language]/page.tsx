import { Metadata } from "next"
import { notFound } from "next/navigation"
import { listEntryLanguages } from "../../_actions/lexical-entry-actions"
import { languageName } from "../../ordlistor/lexical-forms"
import QuizView from "../QuizView"

export async function generateMetadata({ params }: { params: Promise<{ language: string }> }): Promise<Metadata> {
	const { language } = await params
	return {
		title: `Glosförhör: ${languageName(decodeURIComponent(language))} | Origo Opus`,
		description: "Glosförhör på dina ord på ett språk",
	}
}

export default async function LanguageQuizPage({ params }: { params: Promise<{ language: string }> }) {
	const code = decodeURIComponent((await params).language)
	const languages = await listEntryLanguages().catch(() => [])
	const match = languages.find(item => item.language === code)
	if (!match) notFound()
	return (
		<QuizView
			source={{ kind: "language", language: code }}
			scope={`bland dina ord på ${languageName(code).toLocaleLowerCase("sv")}`}
			entryCount={match.count}
			back={{ href: "/forhor", label: "Alla språk" }}
		/>
	)
}
