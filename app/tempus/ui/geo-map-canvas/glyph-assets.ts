// Hand-drawn symbol set, sourced from app/tempus/ui/geo-map/assets/*.svg.
export type GlyphAssetKind = "agriculture" | "deciduous-forest" | "forest" | "open" | "wetland"

export type GlyphSet = {
  /** 2-4 full-density variants, picked at random per scattered instance. */
  variants: readonly string[]
  /** Used within the edge-fade margin next to a different land-cover type (see buildEdgeFade). */
  thin: string
  /** Scatter density knob — lower step = denser. Mirrors biotope-texture.ts's DENSITY. */
  density: number
  /** Probability a candidate grid cell keeps its glyph at all. */
  keep: number
  /** The source paths are drawn at a 24×24 scale; this brings them down to map scale. */
  glyphScale: number
  /** Grid cell size in screen px used to step the scatter. */
  cell: number
}

export const GLYPH_ASSETS: Record<GlyphAssetKind, GlyphSet> = {
  "agriculture": {
    variants: [
      "M-9-5C-5-7 1-7 8-5M-8-2C-4-4 2-4 9-2M-9 2C-5 0 1 0 8 2M-8 5C-4 3 2 3 9 5M-7-5-8 5M3-6 2 4",
      "M-9-5C-4-3 2-3 9-5M-9-2C-4 0 2 0 8-2M-8 2C-3 4 3 4 9 2M-8 5C-3 7 3 7 8 5M-5-5-6 5M5-4 4 5",
      "M-9-4C-5-6 2-6 9-4M-8 0C-4-2 2-2 8 0M-9 4C-5 2 2 2 9 4M-6-5-7 5M1-5 0 5M7-4 6 4",
    ],
    thin: "M-7-3C-3-5 2-5 7-3M-7 1C-3-1 2-1 7 1M-6 4C-2 2 2 2 6 4",
    density: 6,
    keep: 0.55,
    glyphScale: 0.4,
    cell: 10,
  },
  "deciduous-forest": {
    variants: [
      "M-3.1-3.2C-3.5-4.5-2.5-5.6-1.4-5.7C-0.5-5.8 0.1-5.1 0.1-4.1C0-3-0.8-1.9-1.8-1.8C-2.5-1.7-3.1-2.3-3.1-3.2Z",
      "M-1 10V3M-1 3C-6 4-8 0-6-3C-7-6-3-8-1-6C2-9 6-6 5-3C8 0 5 4-1 3M-5-2-3 0M0-5 2-3M3 1 5 0M-2 1 0 0",
      "M1 10V3M1 3C-3 5-7 2-6-2C-7-5-3-8 0-6C3-9 7-5 6-2C8 2 5 5 1 3M-4-1-2 1M-1-5 1-3M3-4 5-2M3 1 5 0",
    ],
    thin: "M0 9V3M0 3C-4 3-5 0-4-3C-3-6 3-6 4-3C5 0 4 3 0 3M-2-1 0 0M1-2 3-1",
    density: 7,
    keep: 0.8,
    glyphScale: 0.42,
    cell: 8,
  },
  "forest": {
    variants: [
      "M-1-10 2-6 5-5 3-2 7 0 4 2 9 6 2 5 2 10-1 10-1 5-8 6-4 2-7 0-3-2-5-5-2-6Z",
      "M1-10 3-7 6-6 4-3 8-1 5 1 9 5 3 4 2 10-1 10-1 5-8 6-5 2-7 0-3-2-5-5-1-6Z",
      "M0-10 3-7 5-6 3-4 7-2 4 0 8 3 4 4 7 7 1 5 1 10-2 10-2 5-8 7-5 4-9 3-4 0-7-2-3-4-5-6-2-7Z",
    ],
    thin: "M0-8 2-4 4-3 2-1 5 2 2 2 5 5 1 4 1 9-1 9-1 4-5 5-2 2-4 1-2-1-3-3-1-4Z",
    density: 7,
    keep: 0.85,
    glyphScale: 0.42,
    cell: 8,
  },
  "open": {
    variants: [
      "M-8 5C-6 3-5 0-5-3M-5 6C-4 3-2 0-1-4M-2 6C-1 3 1 0 2-3M1 6C3 4 5 1 6-2M4 6C6 5 8 3 9 1M-7 7C-3 6 2 6 7 7",
      "M-8 4C-7 1-6-2-7-5M-5 6C-5 2-3-1-2-5M-2 6C0 3 1-1 1-4M2 6C3 3 6 1 7-2M5 6C7 4 8 2 9 0M-8 7C-4 6 2 7 8 6",
      "M-8 5C-7 2-8-1-9-3M-5 6C-4 2-4-2-3-6M-1 6C0 2 2-1 3-5M3 6C5 3 7 1 9-1M-7 7C-3 6 3 7 8 6",
    ],
    thin: "M-4 6C-4 2-3-1-2-4M0 6C1 2 2-1 3-3M-5 7C-2 6 2 7 5 6",
    density: 6,
    keep: 0.6,
    glyphScale: 0.4,
    cell: 9,
  },
  "wetland": {
    variants: [
      "M-5 8C-5 3-6-2-7-7M-2 8C-2 3-1-3-2-9M1 8C2 3 3-2 4-7M4 8C6 5 8 2 8-3M-8 9C-4 8 2 9 8 8M-7 5-4 4M1 4 4 3",
      "M-6 8C-6 4-7 0-8-4M-3 8C-3 4-2-2-2-8M0 8C1 3 2-3 1-9M3 8C4 4 7 0 7-5M-8 9C-4 8 2 9 8 8M-6 4-3 3M2 4 5 2",
      "M-5 8C-4 3-5-3-6-8M-1 8C0 4 0-2 1-9M2 8C3 4 5-2 6-6M5 8C7 6 8 2 9-2M-8 9C-4 8 2 9 8 8M-5 3-2 2M2 3 5 1",
    ],
    thin: "M-2 8C-2 3-2-2-3-6M1 8C2 4 3 0 3-5M-5 9C-2 8 2 9 5 8",
    density: 7,
    keep: 0.7,
    glyphScale: 0.4,
    cell: 9,
  },
}
