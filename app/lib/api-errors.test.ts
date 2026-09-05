import { describe, expect, it } from "vitest"
import { firstErrorMessage, readErrorBody } from "./api-errors"

describe("firstErrorMessage", () => {
  it("returns the first array error message for the first field", () => {
    const detail = JSON.stringify({ email: ["Ogiltig e-postadress."], name: ["Krävs."] })
    expect(firstErrorMessage(detail, 400)).toBe("Ogiltig e-postadress.")
  })

  it("returns a plain string field value", () => {
    const detail = JSON.stringify({ detail: "Något gick fel." })
    expect(firstErrorMessage(detail, 400)).toBe("Något gick fel.")
  })

  it("falls back to detail when the first key has no usable value", () => {
    const detail = JSON.stringify({ non_field_errors: [], detail: "Kontot är låst." })
    expect(firstErrorMessage(detail, 403)).toBe("Kontot är låst.")
  })

  it("never surfaces a non-JSON body, falling back to a generic message", () => {
    expect(firstErrorMessage("<html>Internal Server Error</html>", 500)).toBe("Ett fel uppstod (500).")
  })

  it("falls back to a generic message for an empty body", () => {
    expect(firstErrorMessage("", 404)).toBe("Ett fel uppstod (404).")
  })
})

describe("readErrorBody", () => {
  type Values = { name: string; email: string }

  it("extracts errors for known fields", () => {
    const detail = JSON.stringify({ name: ["Namn krävs."], email: ["Ogiltig e-post."] })
    const result = readErrorBody<Values>(detail, ["name", "email"])
    expect(result).toEqual({ fieldErrors: { name: "Namn krävs.", email: "Ogiltig e-post." } })
  })

  it("ignores fields not in the known list", () => {
    const detail = JSON.stringify({ name: ["Namn krävs."], unrelated: ["Ignoreras."] })
    const result = readErrorBody<Values>(detail, ["name", "email"])
    expect(result).toEqual({ fieldErrors: { name: "Namn krävs." } })
  })

  it("falls back to a top-level detail message when no known field has an error", () => {
    const detail = JSON.stringify({ detail: "Inte inloggad." })
    const result = readErrorBody<Values>(detail, ["name", "email"])
    expect(result).toEqual({ message: "Inte inloggad." })
  })

  it("returns an empty result for a non-JSON body", () => {
    const result = readErrorBody<Values>("<html>oops</html>", ["name", "email"])
    expect(result).toEqual({})
  })

  it("returns an empty result when the body has neither known fields nor detail", () => {
    const detail = JSON.stringify({ something: "else" })
    const result = readErrorBody<Values>(detail, ["name", "email"])
    expect(result).toEqual({})
  })

  it("accepts a plain string field value, not just an array", () => {
    const detail = JSON.stringify({ name: "Namn krävs." })
    const result = readErrorBody<Values>(detail, ["name", "email"])
    expect(result).toEqual({ fieldErrors: { name: "Namn krävs." } })
  })
})
