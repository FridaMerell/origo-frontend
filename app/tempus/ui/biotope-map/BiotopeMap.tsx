import type { ComponentPropsWithoutRef } from "react"
import { generateMap } from "./generate"
import type { Biotope, FeatureKey, MapOptions, MapTheme } from "./types"
import { MapCanvas } from "./MapCanvas"
import { TempusSpecies } from "@/app/lib/dal"

const DEFAULT_FEATURES: Record<FeatureKey, boolean> = {
  trees: false,
  ponds: false,
  meadows: false,
  hills: false,
  valleys: false,
  roads: false,
}

export const DEFAULT_BIOTOPE_MAP_OPTIONS: MapOptions = {
  biotope: "boreal",
  seed: "ORIGO",
  width: 1200,
  height: 750,
  detail: 5,
  features: DEFAULT_FEATURES,
  featureAmount: 5,
  waterStrength: 5,
  relief: 5,
  frame: false,
  label: false,
  compass: true,
}

const SignificanceRank: Record<string, number> = { stor: 5, har: 3, viss: 1 }

// Dyntaxa landscape-type code → the closest procedural map scene.
const LANDSCAPE_BIOTOPE: Record<string, Biotope> = {
  S: "boreal", // Skog
  J: "agricultural", // Jordbrukslandskap
  F: "mountains", // Fjäll
  V: "marsh", // Våtmark
  M: "marsh", // Myrmark
  L: "lakes", // Limnisk (sötvatten)
  H: "seashore", // Havsstrand / marin miljö
  U: "meadow", // Urban miljö
}

// Pick the map scene from the species' landscape types, most strongly
// associated first; fall back to the default when nothing maps.
const biotopeFromSpecies = (species: TempusSpecies): Biotope => {
  const ranked = [...(species.landscape_types ?? [])].sort(
    (a, b) => (SignificanceRank[b.significance] ?? 0) - (SignificanceRank[a.significance] ?? 0)
  )
  for (const habitat of ranked) {
    const match = LANDSCAPE_BIOTOPE[habitat.code?.toUpperCase()]
    if (match) return match
  }
  return DEFAULT_BIOTOPE_MAP_OPTIONS.biotope
}

export const biotopePropsFromSpecies = (species: TempusSpecies) => {
  return {
    biotope: biotopeFromSpecies(species),
    seed: species.scientific_name || DEFAULT_BIOTOPE_MAP_OPTIONS.seed,
    width: DEFAULT_BIOTOPE_MAP_OPTIONS.width,
    height: DEFAULT_BIOTOPE_MAP_OPTIONS.height,
    detail: DEFAULT_BIOTOPE_MAP_OPTIONS.detail,
    featureAmount: DEFAULT_BIOTOPE_MAP_OPTIONS.featureAmount,
    waterStrength: DEFAULT_BIOTOPE_MAP_OPTIONS.waterStrength,
    relief: DEFAULT_BIOTOPE_MAP_OPTIONS.relief,
    frame: DEFAULT_BIOTOPE_MAP_OPTIONS.frame,
    label: DEFAULT_BIOTOPE_MAP_OPTIONS.label,
    compass: DEFAULT_BIOTOPE_MAP_OPTIONS.compass,

  }
}

export type BiotopeMapProps = Omit<ComponentPropsWithoutRef<"svg">, "children"> &
  Partial<Omit<MapOptions, "features">> & {
    features?: Partial<Record<FeatureKey, boolean>>
    title?: string | undefined
    theme?: Partial<MapTheme> | undefined
  }

/**
 * Self-contained procedural biotope map for embedding in another React view.
 * The same props always produce the same SVG scene.
 */
export function BiotopeMap({
  biotope = DEFAULT_BIOTOPE_MAP_OPTIONS.biotope,
  seed = DEFAULT_BIOTOPE_MAP_OPTIONS.seed,
  width = DEFAULT_BIOTOPE_MAP_OPTIONS.width,
  height = DEFAULT_BIOTOPE_MAP_OPTIONS.height,
  detail = DEFAULT_BIOTOPE_MAP_OPTIONS.detail,
  features,
  featureAmount = DEFAULT_BIOTOPE_MAP_OPTIONS.featureAmount,
  waterStrength = DEFAULT_BIOTOPE_MAP_OPTIONS.waterStrength,
  relief = DEFAULT_BIOTOPE_MAP_OPTIONS.relief,
  frame = DEFAULT_BIOTOPE_MAP_OPTIONS.frame,
  label = DEFAULT_BIOTOPE_MAP_OPTIONS.label,
  compass = DEFAULT_BIOTOPE_MAP_OPTIONS.compass,
  title,
  theme,
  ...svgProps
}: BiotopeMapProps) {
  const trees = features?.trees ?? DEFAULT_FEATURES.trees
  const ponds = features?.ponds ?? DEFAULT_FEATURES.ponds
  const meadows = features?.meadows ?? DEFAULT_FEATURES.meadows
  const hills = features?.hills ?? DEFAULT_FEATURES.hills
  const valleys = features?.valleys ?? DEFAULT_FEATURES.valleys
  const roads = features?.roads ?? DEFAULT_FEATURES.roads

  const scene = generateMap({
    biotope,
    seed,
    width,
    height,
    detail,
    features: { trees, ponds, meadows, hills, valleys, roads },
    featureAmount,
    waterStrength,
    relief,
    frame,
    label,
    compass,
  })

  return <MapCanvas scene={scene} title={title} theme={theme} {...svgProps} />
}
