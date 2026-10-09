import type { Biotope } from "../ui/biotope-map/types"

// Landscape-type name → the closest procedural map scene, for types stored
// without their Dyntaxa letter code.
const SCENES: [RegExp, Biotope][] = [
  [/skog/i, "boreal"],
  [/jordbruk/i, "agricultural"],
  [/fjäll/i, "mountains"],
  [/våtmark|myr/i, "marsh"],
  [/sötvatten|limnisk/i, "lakes"],
  [/hav|marin|brack/i, "seashore"],
  [/urban/i, "meadow"],
]

export function landscapeScene(name: string): Biotope {
  return SCENES.find(([pattern]) => pattern.test(name))?.[1] ?? "meadow"
}
