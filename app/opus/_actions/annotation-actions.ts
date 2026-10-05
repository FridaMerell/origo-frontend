"use server"
import { annotationApi } from "./actions"
import type {
	AnnotationCreate,
	AnnotationUpdate,
	Annotation,
	AnnotationKind,
	AnnotationOrdering,
	AnnotationPage,
	Id,
} from "@/app/lib/dal/opus"

const PAGE_SIZE = 50

export type AnnotationListInput = {
	page?: number
	work?: Id | null
	kind?: AnnotationKind | null
	ordering?: AnnotationOrdering
	search?: string
}

/** En sida av den inloggade användarens annotationer, i alla verk eller i ett valt verk. */
export async function listAnnotations(input: AnnotationListInput = {}): Promise<AnnotationPage> {
	const page = Number.isInteger(input.page) && (input.page ?? 0) > 0 ? input.page : 1
	return annotationApi.list({
		page: String(page),
		page_size: String(PAGE_SIZE),
		work: input.work ? String(input.work) : undefined,
		kind: input.kind || undefined,
		ordering: input.ordering ?? "text",
		search: input.search?.trim() || undefined,
	})
}

export async function createAnnotation(data: AnnotationCreate): Promise<Annotation> {
	return annotationApi.create(data)
}

export async function updateAnnotation(id: number, data: AnnotationUpdate): Promise<Annotation> {
	return annotationApi.update(id, data)
}

export async function deleteAnnotation(id: number): Promise<void> {
	return annotationApi.remove(id)
}
