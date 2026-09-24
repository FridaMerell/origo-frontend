"use client"

import { Work, WorkReadingResponse } from "@/app/lib/dal/opus"
import { createContext, useContext, type ReactNode } from "react"
type OpusData = {
	works: Work[]
	selectedWork: Work | null
	readingProgress: WorkReadingResponse | null
}
const EMPTY_DATA: OpusData = {
	works: [],
	selectedWork: null,
	readingProgress: null,
}
const OpusContext = createContext<OpusData>(EMPTY_DATA)

export function OpusDataProvider({
	children,
	...data
}: OpusData & { children: ReactNode }) {
	return <OpusContext.Provider value={data}>{children}</OpusContext.Provider>
}

export function useWorks() {
	const { works, selectedWork } = useContext(OpusContext)
	return { works, selectedWork }
}

export function useAnnotations() {}
export function useAlignment() {}
