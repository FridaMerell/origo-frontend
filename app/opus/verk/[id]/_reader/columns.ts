import type { AlignmentRow, Id } from "@/app/lib/dal/opus"

/** En kolumn i läsvyn: en utgåva i alignment-setet, med sin färg och sitt språk. */
export type Column = { versionId: Id; editionId: Id; title: string; color: string; language: string }

/** Kapitlet som en kolumn är i vid raden `row`: närmast ovanför i de laddade raderna, annars nedanför. */
export function chapterAt(rows: AlignmentRow[], row: number | null, columnIndex: number): string | null {
	const labelOf = (index: number) => rows[index]?.cells[columnIndex]?.units[0]?.chapter?.label ?? null
	const start = Math.max(0, row === null ? 0 : rows.findIndex(item => item.row === row))
	for (let index = start; index >= 0; index -= 1) {
		const label = labelOf(index)
		if (label) return label
	}
	for (let index = start + 1; index < rows.length; index += 1) {
		const label = labelOf(index)
		if (label) return label
	}
	return null
}

/** Det synliga av en rads element: mobilvyn och tabellen har var sitt, och bara den ena visas. */
export function visibleElement(selector: string) {
	return [...document.querySelectorAll<HTMLElement>(selector)].find(element => element.offsetParent !== null) ?? null
}
