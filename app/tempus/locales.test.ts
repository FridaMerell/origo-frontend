import { describe, expect, it } from "vitest"
import type { TempusLocale } from "@/app/lib/dal"
import { localeContainsPoint, localeRepresentativePoint, localesAtPoint } from "./locales"

const locale: TempusLocale = {
  id: 1,
  name: "Testlokal",
  user: 1,
  geometry: {
    type: "MultiPolygon",
    coordinates: [[[
      [10, 55], [20, 55], [20, 65], [10, 65], [10, 55],
    ]]],
  },
}

describe("locale geometry", () => {
  it("matches a point inside a locale", () => {
    expect(localeContainsPoint(locale, [15, 60])).toBe(true)
    expect(localesAtPoint([locale], 15, 60)).toEqual([locale])
  })

  it("does not match a point outside a locale", () => {
    expect(localeContainsPoint(locale, [25, 60])).toBe(false)
  })

  it("returns a representative point inside the locale", () => {
    const point = localeRepresentativePoint(locale)
    expect(point).not.toBeNull()
    expect(localeContainsPoint(locale, point!)).toBe(true)
  })
})
