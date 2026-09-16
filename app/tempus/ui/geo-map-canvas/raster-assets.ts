import type { GlyphAssetKind } from "@/app/tempus/ui/geo-map-canvas/glyph-assets"
import jordebokReference from "@/app/tempus/ui/geo-map/assets/jordebok-reference.png"

type SourceCrop = { x: number; y: number; width: number; height: number }

export type RasterSprite = {
  src: string
  width: number
  height: number
  crop: SourceCrop
  preserveAlpha?: boolean
}

export type RasterSet = {
  variants: readonly RasterSprite[]
  overviewVariants?: readonly RasterSprite[]
  detailVariants?: readonly RasterSprite[]
  thin?: RasterSprite
  cell: number
  step: number
  keep: number
}

const sourceSprite = (src: string, crop: SourceCrop): RasterSprite => ({ src, width: crop.width, height: crop.height, crop })
const sprite = (crop: SourceCrop): RasterSprite => sourceSprite(jordebokReference.src, crop)
const transparentSprite = (src: string, width: number, height: number): RasterSprite => ({ src, width, height, crop: { x: 0, y: 0, width, height }, preserveAlpha: true })
const numberedFiles = (stem: string) => Array.from({ length: 8 }, (_, index) => `${stem}-${String(index + 1).padStart(2, "0")}.png`)

// This is the only asset register to maintain. Add a filename to the matching
// list when you add a new raster; missing files retain the reference fallback.
const RASTER_FILE_MANIFEST = {
  agriculture: { overview: numberedFiles("field-overview"), detail: [
    "field-detail-01.png",
    "field-detail-02.png",
    "field-detail-03.png",
    "field-detail-4.png",
    "field-detail-5.png",
    "field-detail-6.png",
    "field-detail-7.png",
    "field-detail-8.png",
  ]},
  coniferousForest: { overview: numberedFiles("conifer-overview"), detail: [
    "conifer-detail-01.png",
    "conifer-detail-02.png",
    "conifer-detail-03.png",
    "conifer-detail-4.png",
    "conifer-detail-5.png",
    "conifer-detail-6.png",
    "conifer-detail-7.png",
    "conifer-detail-8.png",
  ]},
  mixedForest: { overview: numberedFiles("mixed-forest-overview"), detail: [
    "deciduous-detail-01.png",
    "deciduous-detail-02.png",
    "deciduous-detail-03.png",
    "conifer-detail-4.png",
    "conifer-detail-5.png",
    "conifer-detail-6.png",
    "conifer-detail-7.png",
    "conifer-detail-8.png",
  ] },
  deciduousForest: { overview: numberedFiles("deciduous-overview"), detail: numberedFiles("deciduous-detail") },
  grass: { overview: numberedFiles("meadow-overview"), detail: numberedFiles("meadow-detail") },
  wetland: { overview: numberedFiles("wetland-overview"), detail: numberedFiles("wetland-detail") },
  open: { overview: numberedFiles("open-overview"), detail: numberedFiles("open-detail") },
  general: { overview: numberedFiles("general-overview"), detail: numberedFiles("general-detail") },
  building: { overview: numberedFiles("building-overview"), detail: numberedFiles("building-detail") },
} as const

const localPngFiles = import.meta.glob("./assets/*.png", { eager: true, query: "?url", import: "default" })
function registeredSprites(filenames: readonly string[], width: number, height: number, fallback: readonly RasterSprite[]) {
  const sprites = filenames.flatMap((filename) => {
    const asset = localPngFiles[`./assets/${filename}`]
    const url = typeof asset === "string"
      ? asset
      : asset && typeof asset === "object" && "src" in asset && typeof asset.src === "string"
        ? asset.src
        : null
    return url ? [transparentSprite(url, width, height)] : []
  })
  return sprites.length ? sprites : fallback
}

// Small excerpts from the reference legend, not generated illustrations.
// `getImage` makes their paper pixels transparent during the first load.
export type RasterAssetKind = GlyphAssetKind | "mixed-forest" | "grass" | "general" | "building"

// field-overview-*.png don't exist yet (only the field-detail-* furrow
// texture has been delivered). The tiny legend-sheet crop is never an
// acceptable fallback for this seamless tile — it's a thin sliver never
// meant to be stretched across a whole field tile, and reads as almost blank
// once it is — so overview falls back to the real, already-tiled detail
// texture instead, and if even that were ever missing, drawSeamlessGroup
// (see its own guard) just draws nothing rather than the legend crop.
const agricultureDetailVariants = registeredSprites(RASTER_FILE_MANIFEST.agriculture.detail, 160, 160, [])

export const RASTER_ASSETS: Partial<Record<RasterAssetKind, RasterSet>> = {
  agriculture: { cell: 12, step: 7, keep: 0.58, variants: agricultureDetailVariants,
    overviewVariants: registeredSprites(RASTER_FILE_MANIFEST.agriculture.overview, 160, 160, agricultureDetailVariants),
    detailVariants: agricultureDetailVariants,
  },
  open: { cell: 12, step: 8, keep: 0.6, variants: [
    sprite({ x: 1302, y: 151, width: 43, height: 43 }), sprite({ x: 1350, y: 153, width: 42, height: 42 }),
    sprite({ x: 1303, y: 201, width: 42, height: 39 }), sprite({ x: 1350, y: 201, width: 42, height: 39 }),
  ], overviewVariants: registeredSprites(RASTER_FILE_MANIFEST.open.overview, 160, 160, []), detailVariants: registeredSprites(RASTER_FILE_MANIFEST.open.detail, 160, 160, []) },
  grass: { cell: 12, step: 9, keep: 0.52, variants: [
    sprite({ x: 1302, y: 383, width: 43, height: 41 }), sprite({ x: 1350, y: 383, width: 42, height: 41 }),
    sprite({ x: 1302, y: 428, width: 43, height: 39 }), sprite({ x: 1350, y: 428, width: 42, height: 39 }),
  ], overviewVariants: registeredSprites(RASTER_FILE_MANIFEST.grass.overview, 160, 160, []), detailVariants: registeredSprites(RASTER_FILE_MANIFEST.grass.detail, 160, 160, []) },
  general: { cell: 12, step: 12, keep: 0.35, variants: [
    sprite({ x: 1304, y: 154, width: 38, height: 38 }), sprite({ x: 1352, y: 202, width: 38, height: 36 }),
  ], overviewVariants: registeredSprites(RASTER_FILE_MANIFEST.general.overview, 160, 160, []), detailVariants: registeredSprites(RASTER_FILE_MANIFEST.general.detail, 160, 160, [
    sprite({ x: 1304, y: 154, width: 38, height: 38 }), sprite({ x: 1352, y: 202, width: 38, height: 36 }),
  ]) },
  forest: { cell: 12, step: 8, keep: 0.72, variants: [
    sprite({ x: 1302, y: 268, width: 43, height: 41 }), sprite({ x: 1350, y: 268, width: 42, height: 41 }),
    sprite({ x: 1302, y: 313, width: 43, height: 39 }), sprite({ x: 1350, y: 313, width: 42, height: 39 }),
  ], overviewVariants: registeredSprites(RASTER_FILE_MANIFEST.coniferousForest.overview, 160, 160, []), detailVariants: registeredSprites(RASTER_FILE_MANIFEST.coniferousForest.detail, 160, 160, [
    sprite({ x: 1302, y: 268, width: 43, height: 41 }), sprite({ x: 1350, y: 268, width: 42, height: 41 }),
    sprite({ x: 1302, y: 313, width: 43, height: 39 }), sprite({ x: 1350, y: 313, width: 42, height: 39 }),
  ]) },
  "mixed-forest": { cell: 12, step: 8, keep: 0.72, variants: [
    sprite({ x: 1302, y: 268, width: 43, height: 41 }), sprite({ x: 1350, y: 268, width: 42, height: 41 }),
    sprite({ x: 1302, y: 313, width: 43, height: 39 }), sprite({ x: 1350, y: 313, width: 42, height: 39 }),
  ], overviewVariants: registeredSprites(RASTER_FILE_MANIFEST.mixedForest.overview, 160, 160, []), detailVariants: registeredSprites(RASTER_FILE_MANIFEST.mixedForest.detail, 160, 160, [
    sprite({ x: 1302, y: 268, width: 43, height: 41 }), sprite({ x: 1350, y: 268, width: 42, height: 41 }),
    sprite({ x: 1302, y: 313, width: 43, height: 39 }), sprite({ x: 1350, y: 313, width: 42, height: 39 }),
  ]) },
  "deciduous-forest": { cell: 12, step: 8, keep: 0.67, variants: [
    sprite({ x: 1308, y: 270, width: 34, height: 37 }), sprite({ x: 1355, y: 271, width: 32, height: 37 }),
    sprite({ x: 1310, y: 315, width: 32, height: 35 }), sprite({ x: 1357, y: 315, width: 31, height: 35 }),
  ], overviewVariants: registeredSprites(RASTER_FILE_MANIFEST.deciduousForest.overview, 160, 160, []), detailVariants: registeredSprites(RASTER_FILE_MANIFEST.deciduousForest.detail, 160, 160, [
    sprite({ x: 1308, y: 270, width: 34, height: 37 }), sprite({ x: 1355, y: 271, width: 32, height: 37 }),
    sprite({ x: 1310, y: 315, width: 32, height: 35 }), sprite({ x: 1357, y: 315, width: 31, height: 35 }),
  ]) },
  wetland: { cell: 12, step: 7, keep: 0.68, variants: [
    sprite({ x: 1302, y: 495, width: 43, height: 41 }), sprite({ x: 1350, y: 495, width: 42, height: 41 }),
    sprite({ x: 1302, y: 540, width: 43, height: 39 }), sprite({ x: 1350, y: 540, width: 42, height: 39 }),
  ], overviewVariants: registeredSprites(RASTER_FILE_MANIFEST.wetland.overview, 160, 160, []), detailVariants: registeredSprites(RASTER_FILE_MANIFEST.wetland.detail, 160, 160, [
    sprite({ x: 1302, y: 495, width: 43, height: 41 }), sprite({ x: 1350, y: 495, width: 42, height: 41 }),
    sprite({ x: 1302, y: 540, width: 43, height: 39 }), sprite({ x: 1350, y: 540, width: 42, height: 39 }),
  ]) },
  // No building glyph exists in the reference legend yet — falls back to the
  // "general" crop as a neutral placeholder until real files land in
  // ./assets/ (building-overview-01..08.png, building-detail-01..08.png).
  building: { cell: 12, step: 10, keep: 0.6, variants: [
    sprite({ x: 1304, y: 154, width: 38, height: 38 }),
  ], overviewVariants: registeredSprites(RASTER_FILE_MANIFEST.building.overview, 160, 160, []), detailVariants: registeredSprites(RASTER_FILE_MANIFEST.building.detail, 160, 160, [
    sprite({ x: 1304, y: 154, width: 38, height: 38 }),
  ]) },
}

const sourceCache = new Map<string, HTMLImageElement>()
const inkCropCache = new Map<string, HTMLCanvasElement>()

function cropKey(sprite: RasterSprite) {
  const { x, y, width, height } = sprite.crop
  return `${sprite.src}:${x}:${y}:${width}:${height}`
}

function makeInkCrop(source: HTMLImageElement, sprite: RasterSprite): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = sprite.crop.width
  canvas.height = sprite.crop.height
  const context = canvas.getContext("2d", { willReadFrequently: true })
  if (!context) throw new Error("Kunde inte förbereda karttexturen.")

  const { x, y, width, height } = sprite.crop
  context.drawImage(source, x, y, width, height, 0, 0, width, height)
  if (!sprite.preserveAlpha) {
    const pixels = context.getImageData(0, 0, width, height)
    for (let index = 0; index < pixels.data.length; index += 4) {
      const luminance = pixels.data[index]! * 0.2126 + pixels.data[index + 1]! * 0.7152 + pixels.data[index + 2]! * 0.0722
      pixels.data[index + 3] = Math.min(pixels.data[index + 3]!, Math.max(0, Math.min(255, (195 - luminance) * 2.35)))
    }
    context.putImageData(pixels, 0, 0)
  }
  return canvas
}

// Registered per-file sprites (transparentSprite/preserveAlpha) declare a
// width/height guess at registration time, before the real file is known —
// the manifest only has a filename then. If the delivered PNG turns out a
// different size (e.g. a square asset where a wide strip was assumed), the
// stale guess becomes a source-rectangle mismatch in makeInkCrop: the canvas
// samples past the image's real bounds, distorting or effectively hiding the
// sprite. Once the image has actually loaded, correct the sprite in place to
// its real dimensions — sprite() legend crops are excluded (preserveAlpha is
// unset there) since their width/height are deliberate sub-regions of a
// shared reference sheet, not a size to autodetect.
function syncPreserveAlphaSize(sprite: RasterSprite, image: HTMLImageElement) {
  if (!sprite.preserveAlpha) return
  if (sprite.width === image.naturalWidth && sprite.height === image.naturalHeight) return
  sprite.width = image.naturalWidth
  sprite.height = image.naturalHeight
  sprite.crop = { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight }
}

// A crop is cleaned once and then reused on every pan and zoom frame.
export function getImage(sprite: RasterSprite, onReady?: () => void): CanvasImageSource | null {
  const source = sourceCache.get(sprite.src)
  if (source?.complete && source.naturalWidth > 0) {
    syncPreserveAlphaSize(sprite, source)
    const key = cropKey(sprite)
    const cachedCrop = inkCropCache.get(key)
    if (cachedCrop) return cachedCrop
    const inkCrop = makeInkCrop(source, sprite)
    inkCropCache.set(key, inkCrop)
    return inkCrop
  }

  const key = cropKey(sprite)
  const cachedCrop = inkCropCache.get(key)
  if (cachedCrop) return cachedCrop

  if (!source) {
    const image = new Image()
    image.onload = () => onReady?.()
    sourceCache.set(sprite.src, image)
    image.src = sprite.src
  }
  return null
}

// A numbered asset series may be only partly delivered while it is being made.
// Start every load, then return only sprites that are ready to draw so missing
// numbers never create random holes in a polygon.
export function getReadySprites(sprites: readonly RasterSprite[], onReady?: () => void): readonly RasterSprite[] {
  const ready: RasterSprite[] = []
  for (const sprite of sprites) {
    if (getImage(sprite, onReady)) ready.push(sprite)
  }
  return ready
}
