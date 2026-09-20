import type { IdentityColor, IdentityThemeModes } from "@/app/lib/dal"
import { normalizeColor, parseColor } from "./color-parse"
import type { IdentityFormValues } from "./identity-form"

export type ImportedTheme = {
  themeModes: IdentityThemeModes
  colors: IdentityColor[]
  headingFont: string
  bodyFont: string
  fontImportUrl: string
  radii: IdentityFormValues["radii"]
  importedCount: number
  warnings: string[]
}

const COLOR_ROLES = {
  background: ["background"],
  text: ["foreground"],
  surface: ["card", "popover"],
  primary: ["primary"],
  secondary: ["secondary"],
  muted: ["muted-foreground"],
  border: ["border", "input"],
  accent: ["accent"],
  danger: ["destructive"],
} as const

const COLOR_NAMES: Record<string, string> = {
  background: "Bakgrund", text: "Text", surface: "Yta", primary: "Primär", secondary: "Sekundär",
  muted: "Dämpad text", border: "Kant", accent: "Accent", danger: "Fel",
}

function block(css: string, selector: string): string {
  const match = css.match(new RegExp(`${selector}\\s*\\{([\\s\\S]*?)\\}`, "i"))
  return match?.[1] ?? ""
}

function variables(source: string): Record<string, string> {
  return Object.fromEntries([...source.matchAll(/--([a-z0-9-]+)\s*:\s*([^;{}]+)\s*;?/gi)].map((match) => [match[1].toLowerCase(), match[2].trim()]))
}

function importableColor(value: string): string | null {
  const parsed = parseColor(value)
  if ("hex" in parsed) return parsed.hex
  // Identity colours are opaque. Preserve the colour itself when a source theme uses alpha for borders.
  const withoutAlpha = value.replace(/\s*\/\s*[^)]+(?=\))/, "")
  const fallback = parseColor(withoutAlpha)
  return "hex" in fallback ? fallback.hex : null
}

function fontName(value: string): string {
  return value.split(",")[0].trim().replace(/^['"]|['"]$/g, "")
}

function px(value: string): number | null {
  const match = value.trim().match(/^([\d.]+)(px|rem)$/i)
  if (!match) return null
  const result = Number(match[1]) * (match[2].toLowerCase() === "rem" ? 16 : 1)
  return Number.isFinite(result) ? Math.round(result) : null
}

export function parseThemeCss(source: string): ImportedTheme {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, "")
  const theme = variables(css.match(/@theme(?:\s+inline)?\s*\{([\s\S]*?)\}/i)?.[1] ?? "")
  const light = variables(block(css, ":root"))
  const dark = variables(block(css, "\\.dark"))
  const warnings: string[] = []
  const hasLight = Object.keys(light).length > 0
  const hasDark = Object.keys(dark).length > 0
  const themeModes: IdentityThemeModes = hasLight && hasDark ? "both" : hasDark ? "dark" : "light"
  const colors: IdentityColor[] = []
  const used = new Set<string>()

  for (const [role, aliases] of Object.entries(COLOR_ROLES)) {
    const sourceName = aliases.find((alias) => light[alias] || dark[alias])
    if (!sourceName) continue
    const lightValue = importableColor(light[sourceName] ?? dark[sourceName] ?? "")
    const darkValue = importableColor(dark[sourceName] ?? light[sourceName] ?? "")
    if (!lightValue && !darkValue) {
      warnings.push(`Kunde inte läsa färgen --${sourceName}.`)
      continue
    }
    const name = COLOR_NAMES[role]
    if (used.has(name)) continue
    used.add(name)
    colors.push({ name, role: role === "danger" ? "danger" : role as IdentityColor["role"], light: lightValue ?? "", dark: darkValue ?? "" })
  }

  for (const [name, value] of Object.entries(light)) {
    if (!/^chart-[1-5]$/.test(name)) continue
    const lightValue = importableColor(value)
    if (!lightValue) continue
    colors.push({ name: `Diagram ${name.slice(-1)}`, role: "", light: lightValue, dark: importableColor(dark[name] ?? value) ?? lightValue })
  }

  const radius = px(light.radius ?? dark.radius ?? "")
  const fontImportUrl = css.match(/@import\s+(?:url\(\s*)?["']?(https:\/\/fonts\.googleapis\.com\/[^"')\s]+)["']?\s*\)?/i)?.[1] ?? ""
  const radii = radius === null ? [] : [
    { key: "sm", value: Math.max(0, radius - 4) },
    { key: "md", value: Math.max(0, radius - 2) },
    { key: "lg", value: radius },
    { key: "xl", value: radius + 4 },
  ]
  if (!colors.length) warnings.push("Hittade inga importerbara semantiska färger.")

  return {
    themeModes,
    colors,
    headingFont: fontName(theme["font-serif"] ?? ""),
    bodyFont: fontName(theme["font-sans"] ?? ""),
    fontImportUrl,
    radii,
    importedCount: colors.length + (radius === null ? 0 : 1),
    warnings,
  }
}
