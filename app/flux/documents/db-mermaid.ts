export type DbFieldKey = "" | "PK" | "FK" | "UK"
export type DbField = { name: string; type: string; key: DbFieldKey }
export type DbTable = { name: string; fields: DbField[] }
export type RelCardinality = "one-one" | "one-many" | "many-many"
export type DbRelation = { id: string; from: string; to: string; cardinality: RelCardinality; label: string }
export type DbSchema = { tables: DbTable[]; relations: DbRelation[] }

const EMBED_PREFIX = "%% erdata:"

export const CARDINALITY_LABELS: Record<RelCardinality, string> = {
  "one-one": "1 – 1",
  "one-many": "1 – N",
  "many-many": "N – N",
}

const CARD_TO_MERMAID: Record<RelCardinality, string> = {
  "one-one": "||--||",
  "one-many": "||--o{",
  "many-many": "}o--o{",
}

export const emptySchema = (): DbSchema => ({ tables: [], relations: [] })

export const starterSchema = (): DbSchema => ({
  tables: [{ name: "tabell", fields: [{ name: "id", type: "integer", key: "PK" }] }],
  relations: [],
})

const ident = (value: string) => value.trim().replace(/[^A-Za-z0-9_]+/g, "_").replace(/^_+|_+$/g, "") || "namnlös"

/** Render a schema as a Mermaid `erDiagram`, with the model embedded for lossless editing. */
export function schemaToMermaid(schema: DbSchema): string {
  const lines = [`${EMBED_PREFIX}${JSON.stringify(schema)}`, "erDiagram"]

  for (const table of schema.tables) {
    const name = ident(table.name)
    if (table.fields.length === 0) {
      lines.push(`  ${name} {`, `  }`)
      continue
    }
    lines.push(`  ${name} {`)
    for (const field of table.fields) {
      const type = ident(field.type || "text")
      const key = field.key ? ` ${field.key}` : ""
      lines.push(`    ${type} ${ident(field.name)}${key}`)
    }
    lines.push(`  }`)
  }

  for (const relation of schema.relations) {
    if (!relation.from || !relation.to) continue
    const label = relation.label.trim() || " "
    lines.push(`  ${ident(relation.from)} ${CARD_TO_MERMAID[relation.cardinality]} ${ident(relation.to)} : "${label.replace(/"/g, "'")}"`)
  }

  return lines.join("\n")
}

const MERMAID_TO_CARD = new Map<string, RelCardinality>([
  ["||--||", "one-one"],
  ["||--o{", "one-many"],
  ["}o--o{", "many-many"],
])

function bestEffortParse(content: string): DbSchema {
  const tables: DbTable[] = []
  const relations: DbRelation[] = []
  const lines = content.split("\n")

  let current: DbTable | null = null
  let braced = false
  for (const raw of lines) {
    const indented = /^\s/.test(raw)
    const line = raw.trim()
    if (!line || line.startsWith("%%") || /^erDiagram\b/i.test(line)) continue

    if (current && braced) {
      if (line === "}") { tables.push(current); current = null; braced = false; continue }
      const field = line.match(/^([A-Za-z0-9_]+)\s+([A-Za-z0-9_]+)(?:\s+(PK|FK|UK))?/)
      if (field) current.fields.push({ type: field[1], name: field[2], key: (field[3] as DbFieldKey) ?? "" })
      continue
    }

    const open = line.match(/^([A-Za-z0-9_]+)\s*\{$/)
    if (open) { current = { name: open[1], fields: [] }; braced = true; continue }

    // Legacy plain format: bare table name, then indented `field: type` lines.
    const legacyField = indented ? line.match(/^([A-Za-z0-9_]+)\s*[:\s]\s*([A-Za-z0-9_]+)/) : null
    if (legacyField && current) {
      current.fields.push({ name: legacyField[1], type: legacyField[2], key: "" })
      continue
    }
    if (!indented && /^[A-Za-z0-9_]+$/.test(line)) {
      if (current) tables.push(current)
      current = { name: line, fields: [] }
      continue
    }

    const rel = line.match(/^([A-Za-z0-9_]+)\s+(\|\|--\|\||\|\|--o\{|\}o--o\{)\s+([A-Za-z0-9_]+)\s*:\s*"?([^"]*)"?/)
    if (rel) {
      relations.push({
        id: `r${relations.length}`,
        from: rel[1],
        to: rel[3],
        cardinality: MERMAID_TO_CARD.get(rel[2]) ?? "one-many",
        label: rel[4].trim(),
      })
    }
  }
  if (current) tables.push(current)

  return { tables, relations }
}

/** Turn stored Mermaid ER text into a schema model — embedded model first, then best effort. */
export function mermaidToSchema(content: string): DbSchema {
  const embedded = content.split("\n").find((line) => line.trim().startsWith(EMBED_PREFIX))
  if (embedded) {
    try {
      const parsed = JSON.parse(embedded.trim().slice(EMBED_PREFIX.length)) as Partial<DbSchema>
      if (Array.isArray(parsed.tables) && Array.isArray(parsed.relations)) {
        return { tables: parsed.tables, relations: parsed.relations }
      }
    } catch {
      // fall back to parsing the diagram body
    }
  }
  return bestEffortParse(content)
}

/** Heuristic used when classifying a stored ```mermaid block. */
export function looksLikeErDiagram(content: string): boolean {
  return content.split("\n").some((line) => /^\s*erDiagram\b/i.test(line) || line.trim().startsWith(EMBED_PREFIX))
}
