const BOUNDARY_CHAR = /[\s.,!?;:()[\]{}"'»«]/

/** Backends reject offsets that don't align to a whole token, so trim any
 *  incidental punctuation/whitespace a mouse drag picked up at the edges. */
export function trimToTokenBounds(content: string, start: number, end: number): [number, number] {
	let s = start
	let e = end
	while (s < e && BOUNDARY_CHAR.test(content[s])) s++
	while (e > s && BOUNDARY_CHAR.test(content[e - 1])) e--
	return [s, e]
}

export function getTextOffset(container: Node, targetNode: Node, targetOffset: number): number {
	let offset = 0
	// Definitionsrutorna ligger i samma element som texten men hör inte till den.
	const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, node =>
		node.parentElement?.closest("[data-term-card]") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
	)
	let node: Node | null
	while ((node = walker.nextNode())) {
		if (node === targetNode) {
			return offset + targetOffset
		}
		offset += (node as Text).length
	}
	return offset
}

export type WordToken = { text: string; end: number; isWord: boolean }

/** Delar upp texten i ord och mellanrum, med varje ords slutposition (för delningspunkten). */
export function tokenizeWords(content: string): WordToken[] {
	const tokens: WordToken[] = []
	const pattern = /\S+|\s+/g
	let match: RegExpExecArray | null
	while ((match = pattern.exec(content))) {
		tokens.push({ text: match[0], end: match.index + match[0].length, isWord: !/^\s/.test(match[0]) })
	}
	return tokens
}
