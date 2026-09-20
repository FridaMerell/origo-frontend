/**
 * Colour input for identities. The identity stores `#rrggbb` only, so every other CSS notation is
 * converted to sRGB hex when it is entered. Supported: #rgb, #rrggbb, rgb(), hsl(), oklch(), oklab().
 * Colours outside sRGB (some oklch values) are clamped to the nearest displayable colour.
 */

export type ParsedColor = { hex: string } | { error: string }

export const COLOR_FORMATS_HINT = "hex, rgb(), hsl(), oklch() eller oklab()"

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0")).join("")}`
}

function gamma(linear: number): number {
  const value = clamp(linear, 0, 1)
  return value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055
}

/** OKLab to sRGB hex, via linear sRGB (Björn Ottosson's matrices). */
export function oklabToHex(L: number, a: number, b: number): string {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  return toHex(gamma(r) * 255, gamma(g) * 255, gamma(bl) * 255)
}

export function oklchToHex(L: number, C: number, H: number): string {
  const radians = (H * Math.PI) / 180
  return oklabToHex(L, C * Math.cos(radians), C * Math.sin(radians))
}

function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360
  const f = (n: number) => {
    const k = (n + hue / 30) % 12
    return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1))
  }
  return toHex(f(0) * 255, f(8) * 255, f(4) * 255)
}

const NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i

/** A number, or a percentage mapped so that 100% equals `full`. `none` counts as 0. Null when not numeric. */
function component(token: string, full: number): number | null {
  if (token === "none") return 0
  if (token.endsWith("%")) {
    const value = token.slice(0, -1)
    return NUMBER.test(value) ? (Number(value) / 100) * full : null
  }
  return NUMBER.test(token) ? Number(token) : null
}

/** Hue in degrees; accepts a bare number, `deg`, `turn` and `rad`. */
function hue(token: string): number | null {
  if (token === "none") return 0
  const match = token.match(/^([+-]?(?:\d+\.?\d*|\.\d+))(deg|turn|rad|grad)?$/i)
  if (!match) return null
  const value = Number(match[1])
  switch ((match[2] ?? "deg").toLowerCase()) {
    case "turn": return value * 360
    case "rad": return (value * 180) / Math.PI
    case "grad": return value * 0.9
    default: return value
  }
}

function alphaIsOpaque(token: string | undefined): boolean {
  if (token === undefined) return true
  const value = component(token, 1)
  return value !== null && value >= 0.999
}

const INVALID = `Okänt färgformat. Använd ${COLOR_FORMATS_HINT}.`
const ALPHA = "Genomskinliga färger stöds inte. Identiteten lagrar heltäckande färger (#rrggbb)."

export function parseColor(input: string): ParsedColor {
  // Pasted straight from CSS: drop a trailing `;` and an optional `--name:` / `color:` prefix.
  const value = input.trim().toLowerCase().replace(/^[a-z-]+\s*:\s*(?=[#a-z])/, "").replace(/[;\s]+$/, "")
  if (!value) return { error: "Färg saknas." }

  const hex = value.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/)
  if (hex) {
    let digits = hex[1]
    if (digits.length <= 4) digits = [...digits].map((digit) => digit + digit).join("")
    if (digits.length === 8) {
      if (digits.slice(6) !== "ff") return { error: ALPHA }
      digits = digits.slice(0, 6)
    }
    return { hex: `#${digits}` }
  }

  const fn = value.match(/^(rgba?|hsla?|oklch|oklab)\(\s*(.+?)\s*\)$/)
  if (!fn) return { error: INVALID }

  const tokens = fn[2].split(/[\s,/]+/).filter(Boolean)
  const [name, args] = [fn[1], tokens]
  if (args.length < 3 || args.length > 4) return { error: INVALID }
  if (!alphaIsOpaque(args[3])) return args[3] !== undefined && component(args[3], 1) === null ? { error: INVALID } : { error: ALPHA }

  if (name === "rgb" || name === "rgba") {
    const channels = args.slice(0, 3).map((token) => component(token, 255))
    if (channels.includes(null)) return { error: INVALID }
    const [r, g, b] = channels as number[]
    return { hex: toHex(r, g, b) }
  }

  if (name === "hsl" || name === "hsla") {
    const h = hue(args[0])
    const s = component(args[1], 1)
    const l = component(args[2], 1)
    if (h === null || s === null || l === null) return { error: INVALID }
    // Unitless saturation/lightness are percentages in the legacy syntax (hsl(210, 50, 40)).
    const scale = (token: string, parsed: number) => (token.endsWith("%") || token === "none" ? parsed : parsed / 100)
    return { hex: hslToHex(h, clamp(scale(args[1], s), 0, 1), clamp(scale(args[2], l), 0, 1)) }
  }

  if (name === "oklch") {
    const L = component(args[0], 1)
    const C = component(args[1], 0.4)
    const H = hue(args[2])
    if (L === null || C === null || H === null) return { error: INVALID }
    return { hex: oklchToHex(clamp(L, 0, 1), Math.max(0, C), H) }
  }

  const L = component(args[0], 1)
  const a = component(args[1], 0.4)
  const b = component(args[2], 0.4)
  if (L === null || a === null || b === null) return { error: INVALID }
  return { hex: oklabToHex(clamp(L, 0, 1), a, b) }
}

/** The hex for any supported notation, or the input unchanged when it cannot be read (so validation can report it). */
export function normalizeColor(input: string): string {
  const parsed = parseColor(input)
  return "hex" in parsed ? parsed.hex : input.trim()
}
