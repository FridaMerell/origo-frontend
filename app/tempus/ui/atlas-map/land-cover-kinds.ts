import type { GeoJsonProperties } from "geojson"
import type { LandCoverMapFeature } from "@/app/lib/land-cover"
import type { RasterAssetKind } from "@/app/tempus/ui/geo-map-canvas/raster-assets"

// The full set of land-cover kinds Lantmäteriet's `objekttyp`/`objekttyp_group`
// classifies a parcel into. This is the only classification system the atlas
// uses — there is no external basemap or fallback data source underneath it.
export const ORIGO_TEXTURE_KINDS = ["agriculture", "coniferous-forest", "deciduous-forest", "mixed-forest", "grass", "wetland", "open", "alvar", "mountains", "water", "general"] as const
export type OrigoTextureKind = typeof ORIGO_TEXTURE_KINDS[number]

// Typed loosely (not against MapLibre's own expression types) since
// `Record<string, unknown>` is enough to keep `any` out of ORIGO_KIND_FILL
// below without modelling the full style-spec grammar.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const WATER_FILL_COLOR = "#c3d3d2"
export const WATER_LINE_COLOR = "#5b8388"

const FOREST_FILL_COLOR_EXPRESSION: any =["interpolate", ["linear"], ["zoom"], 6, "#d5d9bd", 12, "#e0e3c9", 16, "#e8e8d5"]

export const ORIGO_KIND_FILL: Partial<Record<OrigoTextureKind, Record<string, unknown>>> = {
  agriculture: { "fill-color": ["interpolate", ["linear"], ["zoom"], 11, "#eee8c8", 14, "#f2ead0"], "fill-opacity": .72 },
  "coniferous-forest": { "fill-color": FOREST_FILL_COLOR_EXPRESSION, "fill-opacity": .9 },
  "mixed-forest": { "fill-color": FOREST_FILL_COLOR_EXPRESSION, "fill-opacity": .9 },
  "deciduous-forest": { "fill-color": FOREST_FILL_COLOR_EXPRESSION, "fill-opacity": .9 },
  grass: { "fill-color": "#e7ebd3", "fill-opacity": .72 },
  open: { "fill-color": "#ded9c4", "fill-opacity": .75 },
  alvar: { "fill-color": "#ded9c4", "fill-opacity": .75 },
  mountains: { "fill-color": "#ded9c4", "fill-opacity": .75 },
  water: { "fill-color": WATER_FILL_COLOR, "fill-opacity": 1 },
  // This is the fallback bucket whenever origoTextureKind()'s Swedish/English
  // keyword matching doesn't recognise a feature's `objekttyp` — kept
  // visible (not near-invisible) so a real classification mismatch shows up
  // as a noticeably odd patch rather than silently blending into the
  // background.
  general: { "fill-color": "#c9cdb0", "fill-opacity": .3 },
}

// Swedish headings for when Lantmäteriet's own `objekttyp` is just a bare,
// generic term (e.g. plain "Skog") rather than a specific subtype (e.g.
// "Barr- och blandskog") — falls back to our own texture-kind bucket, which
// is at least as specific as the classification already driving the visible
// texture.
export const ORIGO_KIND_LABEL: Record<OrigoTextureKind, string> = {
  agriculture: "Åkermark",
  "coniferous-forest": "Barrskog",
  "deciduous-forest": "Lövskog",
  "mixed-forest": "Blandskog",
  grass: "Ängsmark",
  wetland: "Sankmark",
  open: "Öppen mark",
  alvar: "Alvarmark",
  mountains: "Fjällmark",
  water: "Hav",
  general: "Okänd marktyp",
}

// The canvas raster texture works from a coarser, 8-value kind set than the
// fill/label tables above — coniferous-forest shares the "forest" sprite
// set, and alvar/mountains both fall back to "open", since none of those
// pairs have their own dedicated artwork.
export const RASTER_KIND_BY_ORIGO_KIND: Record<Exclude<OrigoTextureKind, "water">, RasterAssetKind> = {
  agriculture: "agriculture",
  "coniferous-forest": "forest",
  "mixed-forest": "mixed-forest",
  "deciduous-forest": "deciduous-forest",
  grass: "grass",
  wetland: "wetland",
  open: "open",
  alvar: "open",
  mountains: "open",
  general: "general",
}

const GENERIC_OBJEKTTYP = new Set(["skog", "åker", "åkermark", "mark", "markyta", "mark yta"])

export function origoTextureKind(feature: LandCoverMapFeature): OrigoTextureKind {
  // `kind` is the backend's own authoritative land_cover/wetland split, sent
  // top-level on the feature (not nested in `properties`). Trust it first
  // when present.
  if (feature.kind === "wetland") return "wetland"
  const properties = feature.properties
  if (typeof properties.objekttyp === "string" && properties.objekttyp.trim().toLowerCase() === "hav") return "water"
  const values = [properties.kind, properties.objekttyp, properties.objekttyp_group]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase()
  if (values.includes("våtmark") || values.includes("sank") || values.includes("myr") || values.includes("wetland")) return "wetland"
  if (values.includes("lövskog") || values.includes("lövträd") || values.includes("deciduous")) return "deciduous-forest"
  if (values.includes("barrskog") || values.includes("barrträd") || values.includes("conifer")) return "coniferous-forest"
  if (values.includes("blandskog") || values.includes("mixed forest")) return "mixed-forest"
  // A bare "skog"/"forest" with no species-specific objekttyp means the
  // backend collapsed every forest species into a bare group with no finer
  // detail. Guessing "mixed-forest" here would silently mislabel real
  // Lövskog/Barrskog as blandskog — "general" is honest about not knowing
  // the species.
  if (values.includes("skog") || values.includes("forest")) return "general"
  if (values.includes("åker") || values.includes("jordbruk") || values.includes("odlad") || values.includes("agriculture")) return "agriculture"
  if (values.includes("allvar") || values.includes("alvar")) return "alvar"
  if (values.includes("fjäll") || values.includes("berg") || values.includes("mountain")) return "mountains"
  if (values.includes("äng") || values.includes("gräs") || values.includes("grass")) return "grass"
  if (values.includes("öppen mark") || values.includes("hed")) return "open"
  return "general"
}

// null for water: sea has no raster artwork and must never be stamped over.
export function rasterTextureKind(feature: LandCoverMapFeature): RasterAssetKind | null {
  const kind = origoTextureKind(feature)
  return kind === "water" ? null : RASTER_KIND_BY_ORIGO_KIND[kind]
}

export function landLabel(properties: GeoJsonProperties | null) {
  // `objekttyp` is the origo-land-cover feature's own classification — the
  // same data the visible texture is drawn from.
  const objekttyp = properties?.objekttyp
  return typeof objekttyp === "string" && objekttyp.trim() ? objekttyp.replaceAll("_", " ") : "Markyta"
}

export function origoLandLabel(feature: LandCoverMapFeature) {
  const objekttyp = feature.properties.objekttyp
  if (typeof objekttyp === "string" && objekttyp.trim() && !GENERIC_OBJEKTTYP.has(objekttyp.trim().toLowerCase())) {
    return objekttyp.replaceAll("_", " ")
  }
  return ORIGO_KIND_LABEL[origoTextureKind(feature)]
}
