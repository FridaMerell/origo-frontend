"use server"
import { annotationApi } from "./actions"
import type { AnnotationCreate, AnnotationUpdate, Annotation } from "@/app/lib/dal/opus"

/** Alla den inloggade användarens annotationer, i alla verk (ingen paginering). */
export async function listAllAnnotations(): Promise<Annotation[]> {
	return annotationApi.list()
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
