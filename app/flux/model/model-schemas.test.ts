import { describe, expect, it } from "vitest"
import {
  fluxFieldFormSchema,
  fluxIntegrationFormSchema,
  fluxRelationFormSchema,
  fluxScreenFormSchema,
  fluxSeedRowFormSchema,
} from "@/app/lib/schemas"

describe("fluxFieldFormSchema", () => {
  const base = { name: "nummer", type: "string", description: "", nullable: false, unique: false, default: "" }

  it("turns an empty max length into null", () => {
    const result = fluxFieldFormSchema.safeParse({ ...base, max_length: "" })
    expect(result.success && result.data.max_length).toBeNull()
  })

  it("coerces a numeric string and rejects zero", () => {
    const ok = fluxFieldFormSchema.safeParse({ ...base, max_length: "50" })
    expect(ok.success && ok.data.max_length).toBe(50)
    expect(fluxFieldFormSchema.safeParse({ ...base, max_length: "0" }).success).toBe(false)
  })

  it("rejects an unknown type", () => {
    expect(fluxFieldFormSchema.safeParse({ ...base, type: "money", max_length: null }).success).toBe(false)
  })
})

describe("fluxRelationFormSchema", () => {
  it("coerces the select values to numbers", () => {
    const result = fluxRelationFormSchema.safeParse({
      source: "1", target: "2", kind: "fk", name: "customer", related_name: "", on_delete: "cascade", nullable: false, description: "",
    })
    expect(result.success && [result.data.source, result.data.target]).toEqual([1, 2])
  })
})

describe("fluxScreenFormSchema", () => {
  it("maps an empty parent to null", () => {
    const result = fluxScreenFormSchema.safeParse({ name: "Start", route: "/", description: "", entities: [], parent: "" })
    expect(result.success && result.data.parent).toBeNull()
  })
})

describe("fluxSeedRowFormSchema", () => {
  it("accepts a JSON object and rejects arrays, scalars and invalid JSON", () => {
    expect(fluxSeedRowFormSchema.safeParse({ entity: 1, data: '{"a":1}' }).success).toBe(true)
    expect(fluxSeedRowFormSchema.safeParse({ entity: 1, data: "[1]" }).success).toBe(false)
    expect(fluxSeedRowFormSchema.safeParse({ entity: 1, data: "5" }).success).toBe(false)
    expect(fluxSeedRowFormSchema.safeParse({ entity: 1, data: "{oops" }).success).toBe(false)
  })
})

describe("fluxIntegrationFormSchema", () => {
  it("keeps env vars as raw text for the action to split", () => {
    const result = fluxIntegrationFormSchema.safeParse({ name: "Stripe", kind: "payment", description: "", env_vars: "A\nB" })
    expect(result.success && result.data.env_vars).toBe("A\nB")
  })
})
