import { describe, expect, it } from "vitest"
import mermaid from "mermaid"
import { mermaidToSchema, schemaToMermaid, type DbSchema } from "./db-mermaid"

describe("database Mermaid conversion", () => {
  it("uses Mermaid-valid, distinct entity ids for colliding display names", async () => {
    const schema: DbSchema = {
      tables: [
        { name: "Order-rad", fields: [{ name: "id", type: "integer", key: "PK" }] },
        { name: "Order rad", fields: [{ name: "id", type: "integer", key: "PK" }] },
        { name: "!!!", fields: [{ name: "värde", type: "???", key: "" }] },
      ],
      relations: [{ id: "r1", from: "Order-rad", to: "Order rad", cardinality: "one-many", label: "har" }],
    }

    const source = schemaToMermaid(schema)

    expect(source).toContain("Order_rad {")
    expect(source).toContain("Order_rad_2 {")
    expect(source).toContain("tabell {")
    expect(source).toContain("text v_rde")
    expect(source).toContain('Order_rad ||--o{ Order_rad_2 : "har"')
    await expect(mermaid.parse(source)).resolves.toMatchObject({ diagramType: "er" })
  })

  it("round-trips editor-generated schemas through the embedded model", () => {
    const schema: DbSchema = {
      tables: [{ name: "Kund", fields: [{ name: "id", type: "uuid", key: "PK" }] }],
      relations: [],
    }

    expect(mermaidToSchema(schemaToMermaid(schema))).toEqual(schema)
  })
})
