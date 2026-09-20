import { describe, expect, it } from "vitest"
import type { FluxIdentity } from "@/app/lib/dal"
import { identityFormSchema, identityFormToPayload, identityToFormValues, newIdentityValues, urlProblem } from "./identity-form"
import { normalizeImportUrl, safeImportUrl } from "./identity-utils"

const withName = () => ({ ...newIdentityValues(), name: "Origo" })

function issuePaths(values: unknown): string[] {
  const result = identityFormSchema.safeParse(values)
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join("."))
}

describe("identityFormSchema", () => {
  it("accepts the starter identity once it has a name", () => {
    expect(identityFormSchema.safeParse(withName()).success).toBe(true)
  })

  it("requires both values per colour for both themes, and only the light one for a light theme", () => {
    const values = withName()
    values.colors[0].dark = ""
    expect(issuePaths(values)).toEqual(["colors.0.dark"])
    expect(issuePaths({ ...values, theme_modes: "light" })).toEqual([])
    const darkOnly = withName()
    expect(issuePaths({ ...darkOnly, theme_modes: "dark", colors: darkOnly.colors.map((c) => ({ ...c, light: "" })) })).toEqual([])
  })

  it("rejects unreadable colours, even for a mode that is not required, and expands short hex", () => {
    const values = { ...withName(), theme_modes: "light" as const }
    values.colors[0].dark = "#ff"
    expect(issuePaths(values)).toEqual(["colors.0.dark"])
    values.colors[0].dark = "#fff"
    const result = identityFormSchema.safeParse(values)
    expect(result.success && result.data.colors[0].dark).toBe("#ffffff")
  })

  it("converts rgb, hsl and oklch input to hex and explains what it cannot read", () => {
    const values = withName()
    values.colors[0].light = "rgb(59 108 246)"
    values.colors[0].dark = "oklch(100% 0 0)"
    values.colors[1].light = "hsl(0, 100%, 50%)"
    const result = identityFormSchema.safeParse(values)
    expect(result.success && [result.data.colors[0].light, result.data.colors[0].dark, result.data.colors[1].light]).toEqual(["#3b6cf6", "#ffffff", "#ff0000"])

    values.colors[2].light = "rgba(0,0,0,0.4)"
    values.colors[3].light = "banana"
    const bad = identityFormSchema.safeParse(values)
    const messages = bad.success ? [] : bad.error.issues.map((issue) => issue.message)
    expect(messages.some((message) => /Genomskinliga/.test(message))).toBe(true)
    expect(messages.some((message) => /Okänt färgformat/.test(message))).toBe(true)
  })

  it("rejects colour names that collapse to the same token", () => {
    const values = withName()
    values.colors.push({ name: "TEXT!", role: "", light: "#000000", dark: "#ffffff" })
    expect(issuePaths(values)).toContain("colors.4.name")
  })

  it("rejects unsafe shadows, bad token keys, duplicate keys and bad urls", () => {
    const values = withName()
    values.shadows = [{ key: "Card", value: "0 0 1px red;}" }]
    values.radii = [{ key: "sm", value: 4 }, { key: "sm", value: 8 }]
    values.assets = [{ name: "Logo", kind: "logo", mode: "any", url: "http://x.test/a.svg", usage: "" }]
    values.font_import_url = "http://x.test/a.css"
    expect(issuePaths(values).sort()).toEqual(["assets.0.url", "font_import_url", "radii.1.key", "shadows.0.key", "shadows.0.value"].sort())
  })

  it("keeps the numeric limits", () => {
    expect(issuePaths({ ...withName(), base_font_size: 40 })).toContain("base_font_size")
    expect(issuePaths({ ...withName(), type_scale_ratio: 2.5 })).toContain("type_scale_ratio")
    expect(issuePaths({ ...withName(), spacing_unit: 0 })).toContain("spacing_unit")
  })
})

describe("font import address", () => {
  const google =
    "fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900&family=Space+Grotesk:wght@300..700&display=swap"

  it("accepts what Google generates, adding https:// and encoding semicolons", () => {
    expect(normalizeImportUrl(google)).toBe(`https://${google.replace(";", "%3B")}`)
    const result = identityFormSchema.safeParse({ ...withName(), font_import_url: google })
    expect(result.success && result.data.font_import_url).toBe(`https://${google.replace(";", "%3B")}`)
  })

  it("leaves complete addresses alone and still rejects real problems", () => {
    expect(normalizeImportUrl("/fonts.css")).toBe("/fonts.css")
    expect(normalizeImportUrl("https://x.test/a.css")).toBe("https://x.test/a.css")
    expect(issuePaths({ ...withName(), font_import_url: "http://x.test/a.css" })).toEqual(["font_import_url"])
    expect(issuePaths({ ...withName(), font_import_url: 'https://x.test/a".css' })).toEqual(["font_import_url"])
  })

  it("lets the preview load the same address", () => {
    expect(safeImportUrl(google)).toBe(`https://${google.replace(";", "%3B")}`)
  })
})

describe("urlProblem", () => {
  it("accepts https and root-relative addresses, including Google Fonts ranges", () => {
    expect(urlProblem("")).toBeNull()
    expect(urlProblem("/fonts.css")).toBeNull()
    expect(urlProblem("https://fonts.googleapis.com/css2?family=Inter:wght@400..700&display=swap")).toBeNull()
    expect(urlProblem("https://fonts.googleapis.com/css?family=Inter:400,600,700")).toBeNull()
  })

  it("names the actual problem", () => {
    expect(urlProblem("http://x.test/a.css")).toMatch(/börja med/)
    expect(urlProblem("https://x.test/a b.css")).toMatch(/mellanslag/)
    expect(urlProblem("https://x.test/a\".css")).toMatch(/Tecknet "/)
    expect(urlProblem("https://fonts.googleapis.com/css2?family=Inter:wght@400;600")).toMatch(/Google Fonts/)
  })
})

describe("payload conversion", () => {
  const identity: FluxIdentity = {
    id: 1, owner: 2, name: "Origo", description: "", brand_name: "", tagline: "", tone: "",
    theme_modes: "both", default_mode: "system",
    colors: [{ name: "Text", role: "text", light: "#111111", dark: "#f2f2f2" }],
    heading_font: "", body_font: "", mono_font: "", font_import_url: "", font_weights: [700, 400],
    base_font_size: 16, type_scale_ratio: "1.250", spacing_unit: 4,
    radii: { sm: 4 }, shadows: { card: "0 1px 2px #0003" }, shadows_dark: {},
    assets: [], logo_rules: "", icon_library: "", icon_style: "", accessibility_target: "AA", guidelines: "",
    created_at: "", updated_at: "",
  }

  it("round-trips through the form and back to the API shape", () => {
    const payload = identityFormToPayload(identityToFormValues(identity))
    expect(payload.type_scale_ratio).toBe("1.250")
    expect(payload.font_weights).toEqual([400, 700])
    expect(payload.radii).toEqual({ sm: 4 })
    expect(payload.shadows).toEqual({ card: "0 1px 2px #0003" })
    expect(payload.shadows_dark).toEqual({})
  })
})
