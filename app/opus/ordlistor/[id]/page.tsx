import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getGlossary } from "../../_actions/glossary-actions"
import GlossaryView from "./GlossaryView"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
	const { id } = await params
	const glossary = await getGlossary(Number(id)).catch(() => null)
	return {
		title: `${glossary?.title ?? "Ordlistan finns inte"} | Origo Opus`,
		description: glossary?.description || "En ordlista i Opus",
	}
}

export default async function GlossaryPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const glossary = await getGlossary(Number(id)).catch(() => null)
	if (!glossary) notFound()
	return <GlossaryView glossary={glossary} />
}
