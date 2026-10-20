"use client"

import { useEffect, useRef, useState } from "react"
import type { AlignmentRow, Id } from "@/app/lib/dal/opus"
import { updateReadingPosition } from "../../../_actions/alignment-actions"
import type { Column } from "./columns"

/** "Läsraden" är den rad som ligger i ett smalt band nära toppen av skärmen. */
const READING_BAND = { rootMargin: "-15% 0px -75% 0px", threshold: 0 }

/** Raden överst i läsbandet, för att visa vilket kapitel varje utgåva är i. */
export function useTopRow(rows: AlignmentRow[]) {
	const [topRow, setTopRow] = useState<number | null>(null)
	useEffect(() => {
		const visible = new Set<number>()
		const observer = new IntersectionObserver(entries => {
			for (const entry of entries) {
				const row = Number((entry.target as HTMLElement).dataset.position)
				if (entry.isIntersecting) visible.add(row)
				else visible.delete(row)
			}
			if (visible.size > 0) setTopRow(Math.min(...visible))
		}, READING_BAND)
		document.querySelectorAll<HTMLElement>("[data-position]").forEach(element => observer.observe(element))
		return () => observer.disconnect()
	}, [rows])
	return topRow
}

/**
 * Sparar läspositionen medan man scrollar, minst var 3:e rad, så "Fortsätt" pekar rätt.
 * Utan `workId`, eller med "Läs utan att uppdatera position", sparas ingenting.
 */
export function useSaveReadingPosition(rows: AlignmentRow[], columns: Column[], workId: Id | undefined, keepPosition: boolean) {
	const lastSentRowRef = useRef<number | null>(null)
	useEffect(() => {
		if (!workId || keepPosition) return
		lastSentRowRef.current = null
		const referenceVersionId = columns[0]?.versionId
		// Både mobilvyn och tabellen har ett element per rad; det dolda skär aldrig läsbandet.
		const elements = rows.flatMap(row =>
			[...document.querySelectorAll<HTMLElement>(`[data-position="${row.row}"]`)].map(element => ({ row, element })),
		)
		if (referenceVersionId == null || elements.length === 0) return

		const observer = new IntersectionObserver(entries => {
			const visible = entries
				.filter(entry => entry.isIntersecting)
				.map(entry => elements.find(item => item.element === entry.target))
				.filter((item): item is { row: AlignmentRow; element: HTMLElement } => item !== undefined)
			if (visible.length === 0) return
			const topRow = visible.reduce((min, item) => (item.row.row < min.row.row ? item : min))
			const last = lastSentRowRef.current
			if (last !== null && Math.abs(topRow.row.row - last) < 3) return
			const cell = topRow.row.cells.find(c => c.alignment_version === referenceVersionId)
			const position = cell?.units[0]?.position
			if (position == null) return
			lastSentRowRef.current = topRow.row.row
			updateReadingPosition(workId, position).catch(() => {})
		}, READING_BAND)
		elements.forEach(({ element }) => observer.observe(element))
		return () => observer.disconnect()
	}, [rows, columns, workId, keepPosition])
}
