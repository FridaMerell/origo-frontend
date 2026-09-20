import { describe, expect, it } from "vitest"
import { normalizeColor, oklchToHex, parseColor } from "./color-parse"

const hex = (input: string) => {
  const parsed = parseColor(input)
  return "hex" in parsed ? parsed.hex : `error: ${parsed.error}`
}

/** Largest per-channel difference between two #rrggbb values. */
function distance(a: string, b: string): number {
  return Math.max(...[1, 3, 5].map((i) => Math.abs(parseInt(a.slice(i, i + 2), 16) - parseInt(b.slice(i, i + 2), 16))))
}

describe("parseColor", () => {
  it("reads hex in any length and lowercases it", () => {
    expect(hex("#FFF")).toBe("#ffffff")
    expect(hex("#0a5")).toBe("#00aa55")
    expect(hex(" #3B6CF6 ")).toBe("#3b6cf6")
    expect(hex("#3b6cf6ff")).toBe("#3b6cf6")
  })

  it("accepts colours pasted from CSS, with a trailing semicolon or a property name", () => {
    expect(hex("oklch(0.945 0.025 85);")).toBe(hex("oklch(0.945 0.025 85)"))
    expect(hex("oklch(0.945 0.025 85);")).toMatch(/^#[0-9a-f]{6}$/)
    expect(hex("--brand-surface: #FFF;")).toBe("#ffffff")
    expect(hex("color: rgb(0 0 0) ;")).toBe("#000000")
    expect(normalizeColor("oklch(0.945 0.025 85);")).toBe(hex("oklch(0.945 0.025 85)"))
  })

  it("reads rgb in comma, space, percent and alpha forms", () => {
    expect(hex("rgb(59, 108, 246)")).toBe("#3b6cf6")
    expect(hex("rgb(59 108 246)")).toBe("#3b6cf6")
    expect(hex("rgb(100% 0% 0%)")).toBe("#ff0000")
    expect(hex("rgba(0, 0, 0, 1)")).toBe("#000000")
    expect(hex("rgb(0 0 0 / 100%)")).toBe("#000000")
  })

  it("reads hsl", () => {
    expect(hex("hsl(0, 100%, 50%)")).toBe("#ff0000")
    expect(hex("hsl(120deg 100% 25%)")).toBe("#008000")
    expect(hex("hsl(0.5turn 100% 50%)")).toBe("#00ffff")
    expect(hex("hsl(210, 50, 40)")).toBe(hex("hsl(210, 50%, 40%)"))
  })

  it("reads oklch close to Tailwind's published hex values", () => {
    expect(distance(hex("oklch(63.7% 0.237 25.331)"), "#fb2c36")).toBeLessThanOrEqual(2)
    expect(distance(hex("oklch(62.3% 0.214 259.815)"), "#2b7fff")).toBeLessThanOrEqual(2)
    expect(hex("oklch(100% 0 0)")).toBe("#ffffff")
    expect(hex("oklch(0 0 none)")).toBe("#000000")
    expect(hex("oklch(0.5 0 0)")).toBe(hex("oklch(50% 0 0)"))
  })

  it("reads oklab and clamps colours outside sRGB", () => {
    expect(hex("oklab(100% 0 0)")).toBe("#ffffff")
    expect(hex("oklch(70% 0.4 150)")).toMatch(/^#[0-9a-f]{6}$/)
    expect(oklchToHex(0.9, 0.5, 200)).toMatch(/^#[0-9a-f]{6}$/)
  })

  it("rejects transparency and unknown notation with a reason", () => {
    expect(hex("rgba(0, 0, 0, 0.5)")).toMatch(/Genomskinliga/)
    expect(hex("#3b6cf680")).toMatch(/Genomskinliga/)
    expect(hex("oklch(50% 0.1 20 / 40%)")).toMatch(/Genomskinliga/)
    expect(hex("red")).toMatch(/Okänt färgformat/)
    expect(hex("rgb(1, 2)")).toMatch(/Okänt färgformat/)
    expect(hex("rgb(a, b, c)")).toMatch(/Okänt färgformat/)
    expect(hex("")).toMatch(/saknas/)
  })
})

describe("normalizeColor", () => {
  it("converts what it can and leaves the rest for validation to report", () => {
    expect(normalizeColor("rgb(59 108 246)")).toBe("#3b6cf6")
    expect(normalizeColor("  banana ")).toBe("banana")
    expect(normalizeColor("")).toBe("")
  })
})
