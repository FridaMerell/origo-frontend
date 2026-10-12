"use client"

import { Glossary, Work, WorkReadingResponse } from "@/app/lib/dal/opus"
import { createContext, useContext, useState, type ReactNode } from "react"

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
 * Alignment-rutnätet (rader, celler, luckor) ägs av `ParallelReader` och hämtas från
 * `GET /alignment-sets/<id>/matrix/`; det ligger medvetet inte här.
 */

type OpusReadingData = {
	readingProgress: WorkReadingResponse | null
	/** Användarens egna ordlistor, hämtade med sidan så att ordpanelen har dem direkt. */
	ownGlossaries: Glossary[]
}

type OpusReadingState = OpusReadingData & {
	/** Läs utan att spara läspositionen medan man scrollar (inställning på verksidan). */
	keepPosition: boolean
	setKeepPosition: (keepPosition: boolean) => void
}

export const OpusReadingContext = createContext<OpusReadingState>({
	readingProgress: null,
	ownGlossaries: [],
	keepPosition: false,
	setKeepPosition: () => {},
})

export function OpusReadingProvider({
	children,
	readingProgress,
	ownGlossaries,
}: OpusReadingData & { children: ReactNode }) {
	const [keepPosition, setKeepPosition] = useState(false)
	return (
		<OpusReadingContext.Provider value={{ readingProgress, ownGlossaries, keepPosition, setKeepPosition }}>
			{children}
		</OpusReadingContext.Provider>
	)
}

export function useReading() {
	const { readingProgress } = useContext(OpusReadingContext)
	return { readingProgress }
}

/** Användarens egna ordlistor, i den öppna läsvyn. */
export function useReadingGlossaries() {
	return useContext(OpusReadingContext).ownGlossaries
}

/** Inställningen "läs utan att uppdatera position" för den öppna läsvyn. */
export function useKeepPosition() {
	const { keepPosition, setKeepPosition } = useContext(OpusReadingContext)
	return [keepPosition, setKeepPosition] as const
}
