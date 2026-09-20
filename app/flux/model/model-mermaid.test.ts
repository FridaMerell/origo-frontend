import { describe, expect, it } from "vitest"
import mermaid from "mermaid"
import type { FluxEntity, FluxField, FluxRelation } from "@/app/lib/dal"
import { modelToMermaid, modelToSchema } from "./model-mermaid"

const entity = (id: number, name: string): FluxEntity => ({
  id, project: 1, name, description: "", created_at: "", updated_at: "",
})

const field = (id: number, entityId: number, name: string, unique = false): FluxField => ({
  id, entity: entityId, name, type: "string", description: "", nullable: false, unique, default: "", max_length: null, order: id,
})

const relation = (id: number, source: number, target: number, kind: FluxRelation["kind"]): FluxRelation => ({
  id, source, target, kind, name: "rel", related_name: "", on_delete: "cascade", nullable: false, description: "",
})

describe("modelToSchema", () => {
  const entities = [entity(1, "Order"), entity(2, "Kund")]
  const fields = [field(1, 1, "nummer", true), field(2, 2, "namn")]

  it("adds an implicit id and marks unique fields", () => {
    const schema = modelToSchema(entities, fields, [])
    expect(schema.tables[0].fields).toEqual([
      { name: "id", type: "int", key: "PK" },
      { name: "nummer", type: "string", key: "UK" },
    ])
  })

  it("draws a foreign key from the target (one) to the source (many)", () => {
    const schema = modelToSchema(entities, fields, [relation(1, 1, 2, "fk")])
    expect(schema.relations[0]).toMatchObject({ from: "Kund", to: "Order", cardinality: "one-many" })
  })

  it("keeps direction for m2m and drops relations to unknown entities", () => {
    const schema = modelToSchema(entities, fields, [relation(1, 1, 2, "m2m"), relation(2, 1, 99, "fk")])
    expect(schema.relations).toHaveLength(1)
    expect(schema.relations[0]).toMatchObject({ from: "Order", to: "Kund", cardinality: "many-many" })
  })

  it("produces valid Mermaid", async () => {
    const source = modelToMermaid(entities, fields, [relation(1, 1, 2, "fk")])
    await expect(mermaid.parse(source)).resolves.toMatchObject({ diagramType: "er" })
  })
})
