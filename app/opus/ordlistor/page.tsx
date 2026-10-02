import { Metadata } from "next"
import { listGlossaries } from "../_actions/glossary-actions"
import GlossariesView from "./GlossariesView"

export const metadata: Metadata = {
	title: "Ordlistor | Origo Opus",
	description: "Dina och andras ordlistor med ord och definitioner",
}

export default async function GlossariesPage() {
	const glossaries = await listGlossaries().catch(() => [])
	return <GlossariesView glossaries={glossaries} />
}
