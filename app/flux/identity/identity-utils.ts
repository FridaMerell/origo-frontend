import type {
  FluxIdentity,
  IdentityAsset,
  IdentityColor,
  IdentityColorRole,
  IdentityThemeModes,
} from "@/app/lib/dal"

export type PreviewMode = "light" | "dark"

export const COLOR_ROLES: IdentityColorRole[] = [
  "primary", "secondary", "accent", "background", "surface", "text", "muted", "border", "success", "warning", "danger",
]

export const FONT_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const

export const TYPE_STEPS: { name: string; step: number }[] = [
  { name: "xs", step: -2 },
  { name: "sm", step: -1 },
  { name: "base", step: 0 },
  { name: "lg", step: 1 },
  { name: "xl", step: 2 },
  { name: "2xl", step: 3 },
  { name: "3xl", step: 4 },
  { name: "4xl", step: 5 },
]

export const SPACE_STEPS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16]

// Patterns the server enforces; mirrored so the form and the preview agree with it.
export const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/
export const TOKEN_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const FONT_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,119}$/
export const URL_PATTERN = /^(?:https:\/\/|\/)[^\s"'()<>;{}\\]+$/
export const UNSAFE_CSS_PATTERN = /[;{}<>\\]|\/\*|\*\/|url\(|@import/i

export function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

export function isHex(value: string): boolean {
  return HEX_PATTERN.test(value)
}

function linear(channel: number): number {
  const c = channel / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

/** WCAG contrast ratio: the lighter colour's luminance first. */
export function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (lighter + 0.05) / (darker + 0.05)
}

/** Colour for a mode, falling back to the other value so a variable is never undefined. */
export function colorValue(color: Pick<IdentityColor, "light" | "dark">, mode: PreviewMode): string {
  return mode === "dark" ? color.dark || color.light : color.light || color.dark
}

export type ContrastRow = {
  mode: PreviewMode
  foreground: string
  background: string
  ratio: number
  required: number
  passed: boolean
}

const TEXT_PAIRS: [string, string][] = [["text", "background"], ["text", "surface"], ["muted", "background"]]
const UI_PAIRS: [string, string][] = [["primary", "background"], ["accent", "background"]]

export function supportedModes(themeModes: IdentityThemeModes): PreviewMode[] {
  return themeModes === "both" ? ["light", "dark"] : [themeModes]
}

/** Contrast for the role pairs that exist, per supported mode. Pairs with a missing or invalid hex are skipped. */
export function contrastReport(
  colors: IdentityColor[],
  target: "AA" | "AAA",
  themeModes: IdentityThemeModes,
): ContrastRow[] {
  const [textRequired, uiRequired] = target === "AAA" ? [7, 4.5] : [4.5, 3]
  const report: ContrastRow[] = []
  for (const mode of supportedModes(themeModes)) {
    const byRole = new Map<string, string>()
    for (const color of colors) {
      // Same lookup the server uses: dark falls back to light, light does not fall back.
      const value = mode === "dark" ? color.dark || color.light : color.light
      if (color.role && !byRole.has(color.role)) byRole.set(color.role, value)
    }
    for (const [pairs, required] of [[TEXT_PAIRS, textRequired], [UI_PAIRS, uiRequired]] as const) {
      for (const [foreground, background] of pairs) {
        const fg = byRole.get(foreground)
        const bg = byRole.get(background)
        if (!fg || !bg || !isHex(fg) || !isHex(bg)) continue
        const ratio = contrastRatio(fg, bg)
        report.push({ mode, foreground, background, ratio: Math.round(ratio * 100) / 100, required, passed: ratio >= required })
      }
    }
  }
  return report
}

/** Number as the generator prints it: up to three decimals, no trailing zeros. */
export function formatNumber(value: number): string {
  const text = value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")
  return text || "0"
}

/** rem size per type step: (base / 16) * ratio ** step. */
export function typeScale(baseFontSize: number, ratio: number): { name: string; rem: string }[] {
  return TYPE_STEPS.map(({ name, step }) => ({ name, rem: `${formatNumber((baseFontSize / 16) * ratio ** step)}rem` }))
}

/** Asset for the current theme: an exact mode match first, then one that works on any background. */
export function pickAsset(assets: IdentityAsset[], kinds: IdentityAsset["kind"][], mode: PreviewMode): IdentityAsset | null {
  const candidates = assets.filter((asset) => kinds.includes(asset.kind) && URL_PATTERN.test(asset.url))
  return candidates.find((asset) => asset.mode === mode) ?? candidates.find((asset) => asset.mode === "any") ?? null
}

/** The values the preview needs; a superset-compatible slice of FluxIdentity, so form state can drive it. */
export type PreviewIdentity = Pick<
  FluxIdentity,
  | "name" | "brand_name" | "tagline" | "theme_modes" | "default_mode" | "colors"
  | "heading_font" | "body_font" | "mono_font" | "font_import_url"
  | "base_font_size" | "spacing_unit" | "radii" | "shadows" | "shadows_dark" | "assets"
> & { type_scale_ratio: string | number }

export function parseRatio(value: string | number): number {
  const ratio = typeof value === "number" ? value : Number.parseFloat(value)
  return Number.isFinite(ratio) && ratio >= 1 && ratio <= 2 ? ratio : 1.25
}

function safeFont(name: string, fallback: string): string | null {
  return FONT_NAME_PATTERN.test(name.trim()) ? `"${name.trim()}", ${fallback}` : null
}

/** `--brand-*` variables for one mode, as the generated tokens.css defines them. Unsafe values are dropped. */
export function previewVariables(identity: PreviewIdentity, mode: PreviewMode): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const color of identity.colors) {
    const token = slug(color.name)
    const value = colorValue(color, mode)
    if (token && isHex(value)) vars[`--brand-${token}`] = value
  }

  const shadows = { ...identity.shadows, ...(mode === "dark" ? identity.shadows_dark : {}) }
  for (const [name, value] of Object.entries(shadows)) {
    if (TOKEN_NAME_PATTERN.test(name) && !UNSAFE_CSS_PATTERN.test(value)) vars[`--brand-shadow-${name}`] = value
  }

  const heading = safeFont(identity.heading_font, "system-ui, sans-serif")
  const body = safeFont(identity.body_font, "system-ui, sans-serif")
  const mono = safeFont(identity.mono_font, "ui-monospace, monospace")
  if (heading) vars["--brand-font-heading"] = heading
  if (body) vars["--brand-font-body"] = body
  if (mono) vars["--brand-font-mono"] = mono

  for (const { name, rem } of typeScale(identity.base_font_size, parseRatio(identity.type_scale_ratio))) {
    vars[`--brand-text-${name}`] = rem
  }
  vars["--brand-space-unit"] = `${identity.spacing_unit}px`
  for (const step of SPACE_STEPS) vars[`--brand-space-${step}`] = `calc(var(--brand-space-unit) * ${step})`
  for (const [name, radius] of Object.entries(identity.radii)) {
    if (TOKEN_NAME_PATTERN.test(name) && Number.isInteger(radius) && radius >= 0 && radius <= 999) {
      vars[`--brand-radius-${name}`] = `${radius}px`
    }
  }
  return vars
}

/**
 * Make a pasted font stylesheet address acceptable. Google Fonts generates addresses without a
 * scheme when copied from the address bar and with `;` between variant groups; both are valid for
 * Google but rejected by the identity rules. A scheme is added, and `;` is percent-encoded, which
 * Google serves identically.
 */
export function normalizeImportUrl(url: string): string {
  let value = url.trim()
  if (!value) return ""
  if (/^[\w-]+(\.[\w-]+)+\//.test(value)) value = `https://${value}`
  return value.replace(/;/g, "%3B")
}

/** Stylesheet URL for the identity's fonts, only when it passes the same check the server applies. */
export function safeImportUrl(url: string): string | null {
  const value = normalizeImportUrl(url)
  return value && URL_PATTERN.test(value) && value.length <= 500 ? value : null
}

/**
 * A file name that passes the identity address rules once it is part of a storage URL: letters,
 * digits, `.`, `_` and `-` only (parentheses, quotes and spaces are rejected there), accents dropped.
 */
export function safeUploadName(name: string): string {
  const dot = name.lastIndexOf(".")
  const clean = (part: string) =>
    part.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "")
  const base = clean(dot > 0 ? name.slice(0, dot) : name).slice(0, 60) || "logotyp"
  const extension = dot > 0 ? clean(name.slice(dot + 1)).slice(0, 8).toLowerCase() : ""
  return extension ? `${base}.${extension}` : base
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")
}
