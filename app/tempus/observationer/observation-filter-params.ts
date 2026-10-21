// The filter choices on "Dina observationer" and their URL parameters. Shared
// by the server page and the client filter, so it must not be a client module.

// Nr, species, time, place and checklist, stage, photos, count: the register's
// columns. The filter row uses the same grid so every rule lines up.
export const REGISTER_COLUMNS =
  "sm:grid-cols-[2.75rem_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,.8fr)_4.5rem_4rem]"

export type ObservationFilterValues = {
  // Dyntaxa taxon ids with their names, in the order they were picked.
  species: { taxonId: number; label: string }[]
  category: string
  locale: string
  checklist: string
  from: string
  to: string
  lifeStage: string
  photos: "" | "ja" | "nej"
  order: "" | "aldst"
}

export const OBSERVATION_FILTER_PARAMS = {
  species: "art",
  category: "grupp",
  locale: "plats",
  checklist: "lista",
  from: "fran",
  to: "till",
  lifeStage: "stadium",
  photos: "bilder",
  order: "ordning",
} as const
