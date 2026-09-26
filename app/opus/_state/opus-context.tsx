"use client"

import { Work, WorkReadingResponse } from "@/app/lib/dal/opus"
import { createContext, useContext, type ReactNode } from "react"
type OpusData = {
	works: Work[]
	selectedWork: Work | null
}
const EMPTY_DATA: OpusData = {
	works: [],
	selectedWork: null,
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


/**
 * Reading provider
 * 
 */

type OpusReadingData = {
	readingProgress: WorkReadingResponse | null
}
export const OpusReadingContext = createContext<OpusReadingData>({readingProgress:null})
export function OpusReadingProvider({
	children,
	readingProgress,
}: OpusReadingData & { children: ReactNode }) {
	return (
		<OpusReadingContext.Provider value={{ readingProgress }}>
			{children}
		</OpusReadingContext.Provider>
	)
}

export function useReading(){
	const {readingProgress} = useContext(OpusReadingContext)
}

export function useAnnotations() {}
export function useAlignment() {}
