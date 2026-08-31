import { looksLikeErDiagram } from "./db-mermaid"

export type DocumentBlock =
  | { id: string; type: "text"; content: string }
  | { id: string; type: "flowchart"; content: string }
  | { id: string; type: "dbschema"; content: string }

export type BlockType = DocumentBlock["type"]

export const BLOCK_LABELS: Record<BlockType, string> = {
  text: "Text",
  flowchart: "Flödesschema",
  dbschema: "Databasschema",
}

let counter = 0
export function blockId() {
  counter += 1
  return `block-${Date.now().toString(36)}-${counter}`
}

/** Parse stored markdown content into an ordered list of editable blocks.
 *  Flowcharts and database schemas are both ```mermaid fences (flowchart / ER);
 *  the visual editors convert to and from their models. */
export function parseBlocks(content: string): DocumentBlock[] {
  const source = content.trim()
  if (!source) return [{ id: blockId(), type: "text", content: "" }]

  const blocks: DocumentBlock[] = []
  const pattern = /```(mermaid|dbschema)\s*\n([\s\S]*?)\n```/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(source)) !== null) {
    const before = source.slice(lastIndex, match.index).trim()
    if (before) blocks.push({ id: blockId(), type: "text", content: before })
    const body = match[2].trim()
    const type: BlockType = match[1] === "dbschema" || looksLikeErDiagram(body) ? "dbschema" : "flowchart"
    blocks.push({ id: blockId(), type, content: body })
    lastIndex = pattern.lastIndex
  }

  const rest = source.slice(lastIndex).trim()
  if (rest) blocks.push({ id: blockId(), type: "text", content: rest })

  return blocks.length > 0 ? blocks : [{ id: blockId(), type: "text", content: "" }]
}

/** Serialise editable blocks back into a single markdown string for storage. */
export function serializeBlocks(blocks: DocumentBlock[]): string {
  return blocks
    .map((block) => {
      const value = block.content.trim()
      if (block.type === "flowchart") return "```mermaid\n" + (value || "flowchart TD") + "\n```"
      if (block.type === "dbschema") return "```mermaid\n" + (value || "erDiagram") + "\n```"
      return value
    })
    .filter(Boolean)
    .join("\n\n")
}
