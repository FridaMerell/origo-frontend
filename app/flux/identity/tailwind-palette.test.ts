import { describe, expect, it } from "vitest"
import { contrastReport } from "./identity-utils"
import {
  DEFAULT_TOKEN_CHOICE,
  HUE_FAMILIES,
  NEUTRAL_FAMILIES,
  TAILWIND_FAMILIES,
  buildStandardTokens,
  tailwindHex,
} from "./tailwind-palette"

const HEX = /^#[0-9a-f]{6}$/

describe("tailwind palette", () => {
  it("has 26 families, split into neutrals and hues", () => {
    expect(TAILWIND_FAMILIES).toHaveLength(26)
    expect([...NEUTRAL_FAMILIES, ...HUE_FAMILIES].sort()).toEqual([...TAILWIND_FAMILIES].sort())
  })

  it("matches Tailwind's published hex values", () => {
    expect(tailwindHex("red", "500")).toBe("#fb2c36")
    expect(() => tailwindHex("red", "555")).toThrow()
  })
})

describe("buildStandardTokens", () => {
  const build = (existing: { name: string; role: string }[] = [], themeModes: "light" | "dark" | "both" = "both") =>
    buildStandardTokens({ choice: DEFAULT_TOKEN_CHOICE, themeModes, existing: existing as never })

  it("adds one token per role, named after the role", () => {
    const tokens = build()
    expect(tokens.map((token) => token.name)).toEqual([
      "background", "surface", "text", "muted", "border", "primary", "secondary", "accent", "success", "warning", "danger",
    ])
    expect(tokens.every((token) => token.name === token.role)).toBe(true)
    expect(tokens.every((token) => HEX.test(token.light) && HEX.test(token.dark))).toBe(true)
  })

  it("skips roles and names that are already in use", () => {
    const tokens = build([{ name: "Brand blue", role: "primary" }, { name: "Text", role: "" }])
    const names = tokens.map((token) => token.name)
    expect(names).not.toContain("primary")
    expect(names).not.toContain("text")
    expect(names).toContain("accent")
    expect(tokens).toHaveLength(9)
  })

  it("fills only the values the theme needs", () => {
    expect(build([], "light").every((token) => token.light && token.dark === "")).toBe(true)
    expect(build([], "dark").every((token) => token.dark && token.light === "")).toBe(true)
  })

  it("meets WCAG AA for the checked pairs in both modes with the defaults", () => {
    const report = contrastReport(build(), "AA", "both")
    expect(report.length).toBeGreaterThanOrEqual(10)
    expect(report.filter((row) => !row.passed)).toEqual([])
  })

  it("keeps text and muted text readable whichever neutral family is chosen", () => {
    for (const neutral of NEUTRAL_FAMILIES) {
      const tokens = buildStandardTokens({ choice: { ...DEFAULT_TOKEN_CHOICE, neutral }, themeModes: "both", existing: [] })
      const failures = contrastReport(tokens, "AA", "both").filter((row) => row.foreground !== "primary" && row.foreground !== "accent" && !row.passed)
      expect(failures, neutral).toEqual([])
    }
  })
})
