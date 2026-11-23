"use client"

import { useMemo } from "react"
import { useStored } from "@/app/lib/use-stored"
import type { Id } from "@/app/lib/dal/opus"
import type { Column } from "./columns"

export type ColumnItem = { column: Column; visible: boolean }

type Stored = { order: Id[]; hidden: Id[] }

function parse(text: string | null): Stored {
	try {
		const value = JSON.parse(text ?? "")
		if (Array.isArray(value?.order) && Array.isArray(value?.hidden)) return value
	} catch {}
	return { order: [], hidden: [] }
}

/**
 * Vilka utgåvor läsvyn visar och i vilken ordning, sparat i webbläsaren per verk.
 * `items` är alla utgåvor i vald ordning; `shown` är de som visas. Minst en utgåva visas alltid.
 */
export function useColumnLayout(workId: Id | undefined, columns: Column[]) {
	const [text, store] = useStored(`opus-columns-${workId ?? "none"}`)

	const items: ColumnItem[] = useMemo(() => {
		const { order, hidden } = parse(text)
		const rank = (column: Column) => {
			const index = order.indexOf(column.editionId)
			return index < 0 ? order.length + columns.indexOf(column) : index
		}
		const sorted = [...columns].sort((a, b) => rank(a) - rank(b))
		const next = sorted.map(column => ({ column, visible: !hidden.includes(column.editionId) }))
		return next.some(item => item.visible) ? next : next.map(item => ({ ...item, visible: true }))
	}, [text, columns])

	function save(next: ColumnItem[]) {
		store(
			JSON.stringify({
				order: next.map(item => item.column.editionId),
				hidden: next.filter(item => !item.visible).map(item => item.column.editionId),
			}),
		)
	}

	function toggle(editionId: Id) {
		const next = items.map(item => (item.column.editionId === editionId ? { ...item, visible: !item.visible } : item))
		if (next.some(item => item.visible)) save(next)
	}

	function move(editionId: Id, step: -1 | 1) {
		const from = items.findIndex(item => item.column.editionId === editionId)
		const to = from + step
		if (from < 0 || to < 0 || to >= items.length) return
		const next = [...items]
		next.splice(to, 0, ...next.splice(from, 1))
		save(next)
	}

	return { items, shown: items.filter(item => item.visible).map(item => item.column), toggle, move }
}
