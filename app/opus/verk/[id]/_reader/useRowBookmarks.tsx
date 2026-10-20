"use client"

import { useState, type ReactNode } from "react"
import { Bookmark as BookmarkIcon } from "lucide-react"
import type { AlignmentRow, Bookmark, Id } from "@/app/lib/dal/opus"
import { addBookmark, removeBookmark } from "../../../_actions/bookmark-actions"
import type { Column } from "./columns"

/** Ritar bokmärkesknappen för en rad. I tabellen syns den vid hovring; på mobil (ingen hovring) alltid. */
export type RenderBookmark = (row: AlignmentRow, alwaysVisible: boolean) => ReactNode

/**
 * Bokmärken på referensutgåvans (första kolumnens) stycke för en rad. Rader utan text i den
 * kolumnen (luckor) kan inte bokmärkas. Returnerar en funktion som ritar radens knapp.
 */
export function useRowBookmarks(
	initialBookmarks: Bookmark[],
	columns: Column[],
	setError: (error: string | null) => void,
): RenderBookmark {
	// Bokmärkta styckens id i referensutgåvan, mappat till bokmärkets id.
	const [bookmarks, setBookmarks] = useState<Record<Id, Id>>(() =>
		Object.fromEntries(initialBookmarks.map(bookmark => [bookmark.unit, bookmark.id])),
	)
	const [bookmarkBusy, setBookmarkBusy] = useState<Id | null>(null)

	// New bookmarks from the server replace the local ones.
	const [shownBookmarks, setShownBookmarks] = useState(initialBookmarks)
	if (shownBookmarks !== initialBookmarks) {
		setShownBookmarks(initialBookmarks)
		setBookmarks(Object.fromEntries(initialBookmarks.map(bookmark => [bookmark.unit, bookmark.id])))
	}

	function referenceUnit(row: AlignmentRow) {
		const referenceVersionId = columns[0]?.versionId
		const cell = row.cells.find(c => c.alignment_version === referenceVersionId)
		return cell?.kind === "text" ? cell.units[0] : null
	}

	async function toggleBookmark(row: AlignmentRow) {
		const unit = referenceUnit(row)
		const editionId = columns[0]?.editionId
		if (!unit || editionId == null || bookmarkBusy != null) return
		setBookmarkBusy(unit.id)
		setError(null)
		const existing = bookmarks[unit.id]
		try {
			if (existing) {
				await removeBookmark(existing)
				setBookmarks(prev => {
					const next = { ...prev }
					delete next[unit.id]
					return next
				})
			} else {
				const created = await addBookmark(editionId, unit.id)
				setBookmarks(prev => ({ ...prev, [unit.id]: created.id }))
			}
		} catch {
			setError("Bokmärket kunde inte sparas.")
		} finally {
			setBookmarkBusy(null)
		}
	}

	return function bookmarkButton(row, alwaysVisible) {
		const unit = referenceUnit(row)
		if (!unit) return null
		const bookmarkId = bookmarks[unit.id]
		return (
			<button
				type='button'
				title={bookmarkId ? "Ta bort bokmärke" : "Lägg till bokmärke"}
				aria-label={bookmarkId ? "Ta bort bokmärke" : "Lägg till bokmärke"}
				aria-pressed={Boolean(bookmarkId)}
				disabled={bookmarkBusy === unit.id}
				onClick={() => toggleBookmark(row)}
				className={`rounded p-1 hover:bg-text/10 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer ${
					bookmarkId
						? "text-primary"
						: alwaysVisible
							? "text-text/30"
							: "text-text/30 opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100"
				}`}>
				<BookmarkIcon size={alwaysVisible ? 16 : 14} fill={bookmarkId ? "currentColor" : "none"} />
			</button>
		)
	}
}
