import { describe, expect, it } from "vitest"
import {
  formatDate,
  formatDateLong,
  formatDateLongOrNull,
  formatDateShort,
  formatMonthYear,
} from "./formatters"

const SAMPLE = new Date(2026, 8, 5) // 5 September 2026

describe("formatDate", () => {
  it("formats a Date using the medium sv-SE style", () => {
    expect(formatDate(SAMPLE)).toBe("5 sep. 2026")
  })

  it("accepts an ISO string", () => {
    expect(formatDate("2026-09-05T12:00:00")).toBe(formatDate(SAMPLE))
  })
})

describe("formatDateShort", () => {
  it("formats as abbreviated month + 2-digit day", () => {
    expect(formatDateShort(SAMPLE)).toBe("05 sep.")
  })
})

describe("formatDateLong", () => {
  it("formats with the full month name", () => {
    expect(formatDateLong(SAMPLE)).toBe("5 september 2026")
  })
})

describe("formatDateLongOrNull", () => {
  it("formats a valid date string the same as formatDateLong", () => {
    expect(formatDateLongOrNull("2026-09-05T12:00:00")).toBe(formatDateLong(SAMPLE))
  })

  it("returns null for an empty string", () => {
    expect(formatDateLongOrNull("")).toBeNull()
  })

  it("returns null for null", () => {
    expect(formatDateLongOrNull(null)).toBeNull()
  })

  it("returns null for an unparseable date", () => {
    expect(formatDateLongOrNull("not a date")).toBeNull()
  })
})

describe("formatMonthYear", () => {
  it("formats the full month name and year, no day", () => {
    expect(formatMonthYear(SAMPLE)).toBe("september 2026")
  })
})
