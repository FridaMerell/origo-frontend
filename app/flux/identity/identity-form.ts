import { z } from "zod"
import type { FluxIdentity } from "@/app/lib/dal"
import { normalizeColor, parseColor } from "./color-parse"
import {
  COLOR_ROLES,
  FONT_NAME_PATTERN,
  FONT_WEIGHTS,
  HEX_PATTERN,
  TOKEN_NAME_PATTERN,
  UNSAFE_CSS_PATTERN,
  normalizeImportUrl,
  slug,
  type PreviewIdentity,
} from "./identity-utils"

const optionalFont = z
  .string()
  .trim()
  .refine((value) => value === "" || FONT_NAME_PATTERN.test(value), "Bara bokstäver, siffror, mellanslag, - och _.")

/** Why an address is rejected, in words; null when it is acceptable (or empty). Same rule as URL_PATTERN. */
export function urlProblem(value: string): string | null {
  if (!value) return null
  if (!/^(https:\/\/|\/)/.test(value)) return "Måste börja med https:// eller /."
  if (/\s/.test(value)) return "Får inte innehålla mellanslag."
  const bad = value.match(/["'()<>;{}\\]/)
  if (bad) {
    const hint = bad[0] === ";" ? " För Google Fonts: skriv wght@400..700 (intervall) eller family=Inter:400,600,700 i stället för wght@400;600;700." : ""
    return `Tecknet ${bad[0]} är inte tillåtet i adressen.${hint}`
  }
  return null
}

const urlField = (maximum: number, required = false) =>
  z
    .string()
    .trim()
    .max(maximum, `Högst ${maximum} tecken.`)
    .superRefine((value, ctx) => {
      if (required && !value) ctx.addIssue({ code: "custom", message: "Ladda upp en fil." })
      const problem = urlProblem(value)
      if (problem) ctx.addIssue({ code: "custom", message: problem })
    })

const tokenKey = z
  .string()
  .trim()
  .regex(TOKEN_NAME_PATTERN, "Gemener och siffror, åtskilda med bindestreck.")

// Any supported notation (rgb, hsl, oklch ...) is converted to #rrggbb here, since that is what is stored.
const colorValue = z.preprocess((value) => (typeof value === "string" ? normalizeColor(value) : value), z.string().trim())

export const identityColorSchema = z.object({
  name: z.string().trim().min(1, "Namn krävs.").max(60, "Högst 60 tecken."),
  role: z.enum(["", ...COLOR_ROLES]),
  light: colorValue,
  dark: colorValue,
})

export const identityFormSchema = z
  .object({
    name: z.string().trim().min(1, "Namn krävs.").max(120, "Högst 120 tecken."),
    description: z.string(),
    brand_name: z.string().trim().max(120, "Högst 120 tecken."),
    tagline: z.string().trim().max(255, "Högst 255 tecken."),
    tone: z.string(),
    theme_modes: z.enum(["light", "dark", "both"]),
    default_mode: z.enum(["system", "light", "dark"]),
    colors: z.array(identityColorSchema),
    heading_font: optionalFont,
    body_font: optionalFont,
    mono_font: optionalFont,
    font_import_url: z.preprocess((value) => (typeof value === "string" ? normalizeImportUrl(value) : value), urlField(500)),
    font_weights: z.array(z.coerce.number().int().refine((value) => (FONT_WEIGHTS as readonly number[]).includes(value), "100 till 900 i steg om 100.")),
    base_font_size: z.coerce.number().int("Heltal.").min(8, "Minst 8.").max(32, "Högst 32."),
    type_scale_ratio: z.coerce.number().min(1, "Minst 1.").max(2, "Högst 2."),
    spacing_unit: z.coerce.number().int("Heltal.").min(1, "Minst 1.").max(16, "Högst 16."),
    radii: z.array(z.object({ key: tokenKey, value: z.coerce.number().int("Heltal.").min(0, "Minst 0.").max(999, "Högst 999.") })),
    shadows: z.array(z.object({ key: tokenKey, value: shadowValue() })),
    shadows_dark: z.array(z.object({ key: tokenKey, value: shadowValue() })),
    assets: z.array(
      z.object({
        name: z.string().trim().min(1, "Namn krävs.").max(80, "Högst 80 tecken."),
        kind: z.enum(["logo", "logo_mark", "icon", "favicon", "illustration", "other"]),
        mode: z.enum(["any", "light", "dark"]),
        url: urlField(500, true),
        usage: z.string().trim().max(500, "Högst 500 tecken."),
      }),
    ),
    logo_rules: z.string(),
    icon_library: z.string().trim().max(60, "Högst 60 tecken."),
    icon_style: z.string().trim().max(60, "Högst 60 tecken."),
    accessibility_target: z.enum(["AA", "AAA"]),
    guidelines: z.string(),
  })
  .superRefine((value, ctx) => {
    const seenColors = new Set<string>()
    value.colors.forEach((color, index) => {
      const token = slug(color.name)
      if (!token) {
        ctx.addIssue({ code: "custom", path: ["colors", index, "name"], message: "Namnet måste innehålla bokstäver eller siffror." })
      } else if (seenColors.has(token)) {
        ctx.addIssue({ code: "custom", path: ["colors", index, "name"], message: "Namnet används redan." })
      }
      seenColors.add(token)

      // Which values are required follows the theme; any value that is given must be #RRGGBB.
      const requires = { light: value.theme_modes !== "dark", dark: value.theme_modes !== "light" }
      for (const mode of ["light", "dark"] as const) {
        const given = color[mode]
        if (!given && requires[mode]) {
          ctx.addIssue({ code: "custom", path: ["colors", index, mode], message: "Krävs för det här temat." })
        } else if (given && !HEX_PATTERN.test(given)) {
          // Not convertible by normalizeColor, so parseColor explains why.
          const parsed = parseColor(given)
          ctx.addIssue({ code: "custom", path: ["colors", index, mode], message: "error" in parsed ? parsed.error : "Ange en giltig färg." })
        }
      }
    })

    for (const list of ["radii", "shadows", "shadows_dark"] as const) {
      const seen = new Set<string>()
      value[list].forEach((entry, index) => {
        if (seen.has(entry.key)) ctx.addIssue({ code: "custom", path: [list, index, "key"], message: "Nyckeln används redan." })
        seen.add(entry.key)
      })
    }
  })

function shadowValue() {
  return z
    .string()
    .trim()
    .min(1, "Krävs.")
    .max(200, "Högst 200 tecken.")
    .refine((value) => !UNSAFE_CSS_PATTERN.test(value), "Ett vanligt box-shadow-värde, utan ; { } url( eller kommentarer.")
}

export type IdentityFormValues = z.infer<typeof identityFormSchema>

export function newIdentityValues(): IdentityFormValues {
  return {
    name: "",
    description: "",
    brand_name: "",
    tagline: "",
    tone: "",
    theme_modes: "both",
    default_mode: "system",
    colors: [
      { name: "Text", role: "text", light: "#111111", dark: "#f2f2f2" },
      { name: "Bakgrund", role: "background", light: "#ffffff", dark: "#0f0f10" },
      { name: "Yta", role: "surface", light: "#f5f5f5", dark: "#1a1a1c" },
      { name: "Primär", role: "primary", light: "#3b6cf6", dark: "#7c9cff" },
    ],
    heading_font: "",
    body_font: "",
    mono_font: "",
    font_import_url: "",
    font_weights: [400, 600, 700],
    base_font_size: 16,
    type_scale_ratio: 1.25,
    spacing_unit: 4,
    radii: [{ key: "sm", value: 4 }, { key: "md", value: 8 }, { key: "lg", value: 16 }],
    shadows: [],
    shadows_dark: [],
    assets: [],
    logo_rules: "",
    icon_library: "",
    icon_style: "",
    accessibility_target: "AA",
    guidelines: "",
  }
}

/** Partial, possibly half-typed form values -> what the preview can safely render. */
export function formValuesToPreview(values: DeepPartialForm): PreviewIdentity {
  const rows = <T>(list: ({ key?: string; value?: T } | undefined)[] | undefined, fallback: T) =>
    Object.fromEntries((list ?? []).flatMap((row) => (row?.key ? [[row.key, row.value ?? fallback] as const] : [])))
  const size = Number(values.base_font_size)
  return {
    name: values.name ?? "",
    brand_name: values.brand_name ?? "",
    tagline: values.tagline ?? "",
    theme_modes: values.theme_modes ?? "both",
    default_mode: values.default_mode ?? "system",
    colors: (values.colors ?? []).map((color) => ({
      name: color?.name ?? "",
      role: color?.role ?? "",
      light: normalizeColor(color?.light ?? ""),
      dark: normalizeColor(color?.dark ?? ""),
    })),
    heading_font: values.heading_font ?? "",
    body_font: values.body_font ?? "",
    mono_font: values.mono_font ?? "",
    font_import_url: values.font_import_url ?? "",
    base_font_size: Number.isFinite(size) && size >= 8 && size <= 32 ? size : 16,
    type_scale_ratio: Number(values.type_scale_ratio),
    spacing_unit: Number.isFinite(Number(values.spacing_unit)) ? Math.min(16, Math.max(1, Number(values.spacing_unit))) : 4,
    radii: rows<number>(values.radii, 0),
    shadows: rows<string>(values.shadows, ""),
    shadows_dark: rows<string>(values.shadows_dark, ""),
    assets: (values.assets ?? []).map((asset) => ({
      name: asset?.name ?? "",
      kind: asset?.kind ?? "other",
      mode: asset?.mode ?? "any",
      url: asset?.url ?? "",
      usage: asset?.usage ?? "",
    })),
  }
}

type DeepPartialForm = {
  [K in keyof IdentityFormValues]?: IdentityFormValues[K] extends (infer Item)[]
    ? (Partial<Item> | undefined)[]
    : IdentityFormValues[K]
}

const entries = <T>(record: Record<string, T>) => Object.entries(record).map(([key, value]) => ({ key, value }))

export function identityToFormValues(identity: FluxIdentity): IdentityFormValues {
  return {
    name: identity.name,
    description: identity.description,
    brand_name: identity.brand_name,
    tagline: identity.tagline,
    tone: identity.tone,
    theme_modes: identity.theme_modes,
    default_mode: identity.default_mode,
    colors: identity.colors.map((color) => ({ ...color })),
    heading_font: identity.heading_font,
    body_font: identity.body_font,
    mono_font: identity.mono_font,
    font_import_url: identity.font_import_url,
    font_weights: [...identity.font_weights],
    base_font_size: identity.base_font_size,
    type_scale_ratio: Number.parseFloat(identity.type_scale_ratio),
    spacing_unit: identity.spacing_unit,
    radii: entries(identity.radii),
    shadows: entries(identity.shadows),
    shadows_dark: entries(identity.shadows_dark),
    assets: identity.assets.map((asset) => ({ ...asset })),
    logo_rules: identity.logo_rules,
    icon_library: identity.icon_library,
    icon_style: identity.icon_style,
    accessibility_target: identity.accessibility_target,
    guidelines: identity.guidelines,
  }
}

const toRecord = <T>(rows: { key: string; value: T }[]) => Object.fromEntries(rows.map((row) => [row.key, row.value]))

/** Request body for /identities/. The ratio goes as a fixed three-decimal string (DRF decimal). */
export function identityFormToPayload(values: IdentityFormValues): Record<string, unknown> {
  return {
    ...values,
    type_scale_ratio: values.type_scale_ratio.toFixed(3),
    font_weights: [...new Set(values.font_weights)].sort((a, b) => a - b),
    radii: toRecord(values.radii),
    shadows: toRecord(values.shadows),
    shadows_dark: toRecord(values.shadows_dark),
  }
}
