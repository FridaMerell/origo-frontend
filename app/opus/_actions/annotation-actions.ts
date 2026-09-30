"use server"
import { annotationApi } from "./actions"
import type { AnnotationCreate, Annotation } from "@/app/lib/dal/opus"

export async function createAnnotation(data: AnnotationCreate): Promise<Annotation> {
	return annotationApi.create(data)
}

export async function deleteAnnotation(id: number): Promise<void> {
	return annotationApi.remove(id)
}
