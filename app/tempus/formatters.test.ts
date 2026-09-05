import { describe, expect, it } from "vitest"
import { formatKm, parseLatLon } from "./formatters"

describe("formatKm", () => {
  it("converts metres to a Swedish-formatted km string", () => {
    expect(formatKm(1000)).toBe("1 km")
  })

  it("rounds to at most one decimal", () => {
    expect(formatKm(12345)).toBe("12,3 km")
  })

  it("handles zero", () => {
    expect(formatKm(0)).toBe("0 km")
  })
})

describe("parseLatLon", () => {
  it("returns null lat/lon when both inputs are empty", () => {
    const result = parseLatLon("", "")
    expect(result).toEqual({ lat: null, lon: null })
  })

  it("parses valid coordinates", () => {
    const result = parseLatLon("59.3", "18.1")
    expect(result).toEqual({ lat: 59.3, lon: 18.1 })
  })

  it("accepts comma decimals", () => {
    const result = parseLatLon("59,3", "18,1")
    expect(result).toEqual({ lat: 59.3, lon: 18.1 })
  })

  it("trims surrounding whitespace", () => {
    const result = parseLatLon(" 59.3 ", " 18.1 ")
    expect(result).toEqual({ lat: 59.3, lon: 18.1 })
  })

  it("errors when only one of the pair is filled in", () => {
    expect(parseLatLon("59.3", "")).toEqual({ error: "Ange både latitud och longitud, eller ingen." })
    expect(parseLatLon("", "18.1")).toEqual({ error: "Ange både latitud och longitud, eller ingen." })
  })

  it("errors when latitude is out of range", () => {
    expect(parseLatLon("91", "18.1")).toEqual({ error: "Ogiltig koordinat." })
    expect(parseLatLon("-91", "18.1")).toEqual({ error: "Ogiltig koordinat." })
  })

  it("errors when longitude is out of range", () => {
    expect(parseLatLon("59.3", "181")).toEqual({ error: "Ogiltig koordinat." })
    expect(parseLatLon("59.3", "-181")).toEqual({ error: "Ogiltig koordinat." })
  })

  it("errors on non-numeric input", () => {
    expect(parseLatLon("abc", "18.1")).toEqual({ error: "Ogiltig koordinat." })
  })

  it("accepts boundary values", () => {
    expect(parseLatLon("90", "180")).toEqual({ lat: 90, lon: 180 })
    expect(parseLatLon("-90", "-180")).toEqual({ lat: -90, lon: -180 })
  })
})
