import { describe, expect, it } from "vitest"
import { formContracts } from "./form-contracts"

describe("all schema-backed forms", () => {
  it.each(formContracts)("accepts a representative $name submission", ({ schema, validValues }) => {
    expect(schema.safeParse(validValues).success).toBe(true)
  })

  it("keeps form names unique so the inventory is unambiguous", () => {
    const names = formContracts.map((contract) => contract.name)
    expect(new Set(names).size).toBe(names.length)
  })
})
