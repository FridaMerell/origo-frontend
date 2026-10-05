import { Metadata } from "next"
import type { AnnotationPage } from "@/app/lib/dal/opus"
import { listAnnotations } from "../_actions/annotation-actions"
import AnnotationsView from "./AnnotationsView"

const EMPTY: AnnotationPage = { results: [], count: 0, next: null, previous: null, page_size: 50, total: 0, works: [], kinds: {} }

export const metadata: Metadata = {
	title: "Anteckningar | Origo Opus",
	description: "Dina anteckningar, hänvisningar och definitioner i alla verk",
}

export default async function AnnotationsPage() {
	const firstPage = await listAnnotations().catch(() => EMPTY)
	return <AnnotationsView firstPage={firstPage} />
}
