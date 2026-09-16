// Canvas 2D's fillStyle/strokeStyle cannot parse `var(--foo, fallback)` the
// way SVG/CSS can — it needs an already-resolved color. All the palette
// tokens this map draws with (PALETTE.*, "var(--accent)", ...) are CSS
// custom properties, so every color has to be resolved against a real DOM
// node before it can be handed to the canvas context.
//
// Resolution is cached per raw string for the lifetime of a paint (cache is
// cleared whenever the theme could plausibly have changed) since the same
// handful of tokens gets reused across thousands of texture glyphs.
export type ColorResolver = (value: string) => string

const VAR_PATTERN = /var\(\s*(--[\w-]+)\s*(?:,\s*([\s\S]+))?\)/

function resolveVarExpression(expression: string, computedStyle: CSSStyleDeclaration, probe: HTMLElement): string {
  const match = expression.match(VAR_PATTERN)
  if (!match) return expression.trim()
  const [, name, fallback] = match
  const value = computedStyle.getPropertyValue(name!).trim()
  if (value) return resolveColorValue(value, computedStyle, probe)
  if (fallback) return resolveColorValue(fallback.trim(), computedStyle, probe)
  return "#000"
}

function resolveColorValue(value: string, computedStyle: CSSStyleDeclaration, probe: HTMLElement): string {
  if (!value.includes("var(")) return value
  return resolveVarExpression(value, computedStyle, probe)
}

/**
 * Builds a resolver bound to `node`'s computed style (so it inherits the
 * host app's light/dark theme). Call once per paint pass — e.g. once before
 * rebuilding the world bitmap — not per element.
 */
export function createColorResolver(node: HTMLElement): ColorResolver {
  const computedStyle = getComputedStyle(node)
  const cache = new Map<string, string>()
  return (value: string) => {
    if (!value.includes("var(")) return value
    const cached = cache.get(value)
    if (cached) return cached
    const resolved = resolveVarExpression(value, computedStyle, node)
    cache.set(value, resolved)
    return resolved
  }
}

/**
 * `ctx.font` (unlike SVG's `font-family`) cannot parse `var(--font-display)`
 * at all — it just silently fails to apply and the canvas falls back to its
 * default sans-serif. Resolve the token to a real font-family string once
 * (same computed-style trick as colors above) and interpolate that into the
 * font string instead.
 */
export function resolveFontFamily(node: HTMLElement, name: string, fallback: string): string {
  const value = getComputedStyle(node).getPropertyValue(name).trim()
  return value || fallback
}
