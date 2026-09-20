import { describe, expect, it } from "vitest"
import { buildPreviewDocument } from "./preview-document"
import type { PreviewIdentity } from "./identity-utils"

const base: PreviewIdentity = {
  name: "Origo",
  brand_name: "Origo",
  tagline: "",
  theme_modes: "both",
  default_mode: "system",
  colors: [
    { name: "Ink", role: "text", light: "#111111", dark: "#f2f2f2" },
    { name: "Paper", role: "background", light: "#ffffff", dark: "#0b0b0b" },
    { name: "Blue", role: "primary", light: "#0055ff", dark: "#88aaff" },
  ],
  heading_font: "Fraunces",
  body_font: "Inter",
  mono_font: "",
  font_import_url: "https://fonts.example.com/css2?family=Inter",
  base_font_size: 16,
  type_scale_ratio: "1.250",
  spacing_unit: 4,
  radii: { sm: 4, md: 8 },
  shadows: { card: "0 1px 2px #0003" },
  shadows_dark: { card: "0 2px 8px #000" },
  assets: [{ name: "Logo", kind: "logo", mode: "any", url: "/logo.svg", usage: "" }],
}

const origin = "https://flux.example.com"

describe("buildPreviewDocument", () => {
  it("uses the colours and shadows of the requested mode", () => {
    const light = buildPreviewDocument(base, "light", origin)
    const dark = buildPreviewDocument(base, "dark", origin)
    expect(light).toContain("--brand-blue:#0055ff")
    expect(dark).toContain("--brand-blue:#88aaff")
    expect(light).toContain("--brand-shadow-card:0 1px 2px #0003")
    expect(dark).toContain("--brand-shadow-card:0 2px 8px #000")
    expect(dark).toContain("color-scheme:dark")
  })

  it("loads the font stylesheet and resolves a root-relative logo against the origin", () => {
    const html = buildPreviewDocument(base, "light", origin)
    expect(html).toContain('<link rel="stylesheet" href="https://fonts.example.com/css2?family=Inter">')
    expect(html).toContain('src="https://flux.example.com/logo.svg"')
  })

  it("shows an uploaded logo from its fetched data, and refuses data that is not a base64 image", () => {
    const upload = { ...base, assets: [{ name: "Logo", kind: "logo" as const, mode: "any" as const, url: "https://acct.r2.cloudflarestorage.com/b/flux/logo.svg", usage: "" }] }
    const good = buildPreviewDocument(upload, "light", origin, { [upload.assets[0].url]: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=" })
    expect(good).toContain('src="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="')

    const bad = buildPreviewDocument(upload, "light", origin, { [upload.assets[0].url]: 'data:text/html;base64,PHNjcmlwdD4=' })
    expect(bad).not.toContain("data:text/html")
    const injected = buildPreviewDocument(upload, "light", origin, { [upload.assets[0].url]: 'data:image/png;base64,AAAA" onerror="x' })
    expect(injected).not.toContain('onerror="x')
  })

  it("escapes identity text and drops unsafe urls, fonts and shadows", () => {
    const hostile: PreviewIdentity = {
      ...base,
      brand_name: '<script>alert(1)</script><img src=x onerror="y">',
      tagline: '"><b>x</b>',
      font_import_url: 'https://x.test/a.css"><script>',
      body_font: "Inter;} body{display:none",
      shadows: { card: "0 0 0 red;} *{display:none" },
      assets: [{ name: "Logo", kind: "logo", mode: "any", url: 'javascript:alert(1)', usage: "" }],
    }
    const html = buildPreviewDocument(hostile, "light", origin)
    expect(html).not.toContain("<script>")
    expect(html).not.toContain("<b>x</b>")
    expect(html).not.toContain("onerror=\"y\"")
    expect(html).not.toContain("javascript:")
    expect(html).not.toContain("display:none")
    expect(html).not.toContain('rel="stylesheet"')
    expect(html).not.toContain("<img class=\"logo\"")
  })

  it("skips sections for missing radii and shadows", () => {
    const html = buildPreviewDocument({ ...base, radii: {}, shadows: {}, shadows_dark: {} }, "light", origin)
    expect(html).not.toContain(">Hörn<")
    expect(html).not.toContain(">Skuggor<")
  })
})
