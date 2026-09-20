import { describe, expect, it } from "vitest"
import type { IdentityColor } from "@/app/lib/dal"
import {
  contrastRatio,
  contrastReport,
  escapeHtml,
  pickAsset,
  previewVariables,
  safeImportUrl,
  safeUploadName,
  slug,
  typeScale,
  type PreviewIdentity,
} from "./identity-utils"

const color = (name: string, role: IdentityColor["role"], light: string, dark: string): IdentityColor => ({ name, role, light, dark })

describe("contrast", () => {
  it("gives 21:1 for black on white and 1:1 for equal colours", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5)
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5)
  })

  it("checks every mode for themes with both, against the AA/AAA thresholds", () => {
    const colors = [
      color("Ink", "text", "#000000", "#ffffff"),
      color("Paper", "background", "#ffffff", "#000000"),
      color("Brand", "primary", "#cccccc", "#333333"),
    ]
    const aa = contrastReport(colors, "AA", "both")
    expect(aa.map((row) => `${row.mode}:${row.foreground}/${row.background}`)).toEqual([
      "light:text/background", "light:primary/background",
      "dark:text/background", "dark:primary/background",
    ])
    expect(aa.find((row) => row.mode === "light" && row.foreground === "primary")?.passed).toBe(false)
    expect(aa.find((row) => row.mode === "dark" && row.foreground === "text")?.required).toBe(4.5)
    expect(contrastReport(colors, "AAA", "both").find((row) => row.foreground === "primary")?.required).toBe(4.5)
  })

  it("checks only the supported mode and skips missing or invalid values", () => {
    const colors = [color("Ink", "text", "", "#ffffff"), color("Paper", "background", "", "#000000"), color("Odd", "surface", "", "nope")]
    const dark = contrastReport(colors, "AA", "dark")
    expect(dark).toHaveLength(1)
    expect(dark[0].mode).toBe("dark")
    expect(contrastReport(colors, "AA", "light")).toEqual([])
  })
})

describe("typeScale", () => {
  it("follows base/16 * ratio ** step", () => {
    const scale = Object.fromEntries(typeScale(16, 1.25).map((step) => [step.name, step.rem]))
    expect(scale.base).toBe("1rem")
    expect(scale.lg).toBe("1.25rem")
    expect(scale.xs).toBe("0.64rem")
    expect(scale["4xl"]).toBe("3.052rem")
  })
})

describe("slug", () => {
  it("lowercases and collapses non-alphanumerics", () => {
    expect(slug("Brand  Blue!")).toBe("brand-blue")
    expect(slug("--x--")).toBe("x")
  })
})

describe("previewVariables", () => {
  const identity: PreviewIdentity = {
    name: "Test", brand_name: "", tagline: "", theme_modes: "both", default_mode: "system",
    colors: [color("Brand Blue", "primary", "#0055ff", "#88aaff"), color("Bad", "", "red", "")],
    heading_font: "Inter", body_font: "x; y", mono_font: "",
    font_import_url: "", base_font_size: 16, type_scale_ratio: "1.250", spacing_unit: 4,
    radii: { sm: 4, "Bad Key": 2, big: 5000 },
    shadows: { card: "0 1px 2px #0003", evil: "0 0 0 red; } body {" },
    shadows_dark: { card: "0 2px 6px #000" },
    assets: [],
  }

  it("uses the light or dark value and dark shadow overrides", () => {
    expect(previewVariables(identity, "light")["--brand-brand-blue"]).toBe("#0055ff")
    expect(previewVariables(identity, "dark")["--brand-brand-blue"]).toBe("#88aaff")
    expect(previewVariables(identity, "light")["--brand-shadow-card"]).toBe("0 1px 2px #0003")
    expect(previewVariables(identity, "dark")["--brand-shadow-card"]).toBe("0 2px 6px #000")
  })

  it("drops anything that could break out of the stylesheet", () => {
    const vars = previewVariables(identity, "light")
    expect(vars["--brand-bad"]).toBeUndefined()
    expect(vars["--brand-shadow-evil"]).toBeUndefined()
    expect(vars["--brand-font-body"]).toBeUndefined()
    expect(vars["--brand-radius-Bad Key"]).toBeUndefined()
    expect(vars["--brand-radius-big"]).toBeUndefined()
    expect(vars["--brand-radius-sm"]).toBe("4px")
    expect(vars["--brand-font-heading"]).toBe('"Inter", system-ui, sans-serif')
  })
})

describe("safeImportUrl and escapeHtml", () => {
  it("accepts https and root-relative stylesheets only", () => {
    expect(safeImportUrl("https://fonts.example.com/css?family=Inter")).toBe("https://fonts.example.com/css?family=Inter")
    expect(safeImportUrl("/fonts.css")).toBe("/fonts.css")
    expect(safeImportUrl("http://x.test/a.css")).toBeNull()
    expect(safeImportUrl('https://x.test/a".css')).toBeNull()
    expect(safeImportUrl("javascript:alert(1)")).toBeNull()
  })

  it("escapes markup", () => {
    expect(escapeHtml(`<b onclick="x">&'`)).toBe("&lt;b onclick=&quot;x&quot;&gt;&amp;&#39;")
  })
})

describe("safeUploadName", () => {
  it("keeps names that are already safe", () => {
    expect(safeUploadName("logo-dark.svg")).toBe("logo-dark.svg")
  })

  it("removes what the address rules reject", () => {
    expect(safeUploadName("Logo (1) 'final'.PNG")).toBe("Logo-1-final.png")
    expect(safeUploadName("Blåbärsvägen.webp")).toBe("Blabarsvagen.webp")
    expect(safeUploadName("$$$.svg")).toBe("logotyp.svg")
    expect(safeUploadName("noextension")).toBe("noextension")
    expect(safeUploadName("a".repeat(100) + ".png")).toBe("a".repeat(60) + ".png")
  })
})

describe("pickAsset", () => {
  const assets = [
    { name: "a", kind: "logo" as const, mode: "any" as const, url: "/any.svg", usage: "" },
    { name: "b", kind: "logo" as const, mode: "dark" as const, url: "https://x.test/dark.svg", usage: "" },
    { name: "c", kind: "logo" as const, mode: "light" as const, url: "javascript:x", usage: "" },
  ]

  it("prefers the matching mode, falls back to any, and ignores unsafe urls", () => {
    expect(pickAsset(assets, ["logo"], "dark")?.name).toBe("b")
    expect(pickAsset(assets, ["logo"], "light")?.name).toBe("a")
    expect(pickAsset(assets, ["favicon"], "light")).toBeNull()
  })
})
