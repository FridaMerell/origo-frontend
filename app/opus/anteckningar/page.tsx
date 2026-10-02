import { Metadata } from "next"
import { listAllAnnotations } from "../_actions/annotation-actions"
import AnnotationsView from "./AnnotationsView"

export const metadata: Metadata = {
	title: "Anteckningar | Origo Opus",
	description: "Dina anteckningar, hänvisningar och definitioner i alla verk",
}

export default async function AnnotationsPage() {
	const annotations = await listAllAnnotations().catch(() => [])
	return <AnnotationsView annotations={annotations} />
}
