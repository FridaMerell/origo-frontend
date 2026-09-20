import { parseColor } from "./color-parse"

type Rgb = { red: number; green: number; blue: number }
type Hsl = { hue: number; saturation: number; lightness: number }

export type ColorConversion = {
  hex: string
  rgb: string
  hsl: string
  oklch: string
}

export type ColorMatch = {
  name: string
  hex: string
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const round = (value: number, digits = 0) => Number(value.toFixed(digits))

function hexToRgb(hex: string): Rgb {
  return {
    red: Number.parseInt(hex.slice(1, 3), 16),
    green: Number.parseInt(hex.slice(3, 5), 16),
    blue: Number.parseInt(hex.slice(5, 7), 16),
  }
}

function rgbToHsl({ red, green, blue }: Rgb): Hsl {
  const [r, g, b] = [red, green, blue].map((channel) => channel / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const lightness = (max + min) / 2
  const delta = max - min

  if (delta === 0) return { hue: 0, saturation: 0, lightness }

  const saturation = delta / (1 - Math.abs(2 * lightness - 1))
  let hue = 0
  if (max === r) hue = ((g - b) / delta) % 6
  else if (max === g) hue = (b - r) / delta + 2
  else hue = (r - g) / delta + 4

  return { hue: (hue * 60 + 360) % 360, saturation, lightness }
}

function hslToHex({ hue, saturation, lightness }: Hsl): string {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const huePart = ((hue % 360) + 360) % 360 / 60
  const secondary = chroma * (1 - Math.abs((huePart % 2) - 1))
  const [r, g, b] =
    huePart < 1 ? [chroma, secondary, 0]
      : huePart < 2 ? [secondary, chroma, 0]
        : huePart < 3 ? [0, chroma, secondary]
          : huePart < 4 ? [0, secondary, chroma]
            : huePart < 5 ? [secondary, 0, chroma]
              : [chroma, 0, secondary]
  const offset = lightness - chroma / 2
  return `#${[r, g, b].map((channel) => Math.round((channel + offset) * 255).toString(16).padStart(2, "0")).join("")}`
}

function rgbToOklch({ red, green, blue }: Rgb): { lightness: number; chroma: number; hue: number } {
  const linear = (channel: number) => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  const [r, g, b] = [red, green, blue].map(linear)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bValue = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const hue = (Math.atan2(bValue, a) * 180 / Math.PI + 360) % 360
  return { lightness, chroma: Math.sqrt(a ** 2 + bValue ** 2), hue }
}

/** Formats a supported CSS colour as the formats stored and shown by Flux. */
export function colorConversions(value: string): ColorConversion | null {
  const parsed = parseColor(value)
  if (!("hex" in parsed)) return null

  const rgb = hexToRgb(parsed.hex)
  const hsl = rgbToHsl(rgb)
  const oklch = rgbToOklch(rgb)
  return {
    hex: parsed.hex,
    rgb: `rgb(${rgb.red} ${rgb.green} ${rgb.blue})`,
    hsl: `hsl(${round(hsl.hue)} ${round(hsl.saturation * 100)}% ${round(hsl.lightness * 100)}%)`,
    oklch: `oklch(${round(oklch.lightness * 100, 1)}% ${round(oklch.chroma, 3)} ${round(oklch.hue)})`,
  }
}

/** A small hue-harmony set that keeps the input's saturation and lightness. */
export function matchingColors(value: string): ColorMatch[] {
  const conversion = colorConversions(value)
  if (!conversion) return []

  const hsl = rgbToHsl(hexToRgb(conversion.hex))
  const match = (name: string, shift: number) => ({
    name,
    hex: hslToHex({ ...hsl, hue: hsl.hue + shift, saturation: clamp(hsl.saturation, 0, 1) }),
  })
  return [
    match("Analog kall", -30),
    match("Komplement", 180),
    match("Analog varm", 30),
    match("Triad", 120),
  ]
}
