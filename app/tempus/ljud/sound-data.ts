"use client"

import type { TempusSpeciesExtended } from "@/app/lib/dal"

type Part = "sounds" | "artfakta"

// Per species and part, kept for as long as the page is open, so what was fetched when a species was added
// is already there when the comparison or the species' advanced view opens.
const FETCHED: Record<Part, Map<string, Promise<TempusSpeciesExtended | null>>> = {
  sounds: new Map(),
  artfakta: new Map(),
}

function fetchPart(id: string, part: Part) {
  const cache = FETCHED[part]
  let pending = cache.get(id)
  if (!pending) {
    pending = fetch(`/api/tempus/species/${id}/extended?part=${part}`).then(async (response) => {
      if (!response.ok) throw new Error("Servern svarade inte.")
      return (await response.json()) as TempusSpeciesExtended | null
    })
    pending.catch(() => cache.delete(id))
    cache.set(id, pending)
  }
  return pending
}

/** The recordings of a species (`sounds`, `sounds_error`), fetched once and at the same time as everything else asked for. */
export const soundsOf = (id: string) => fetchPart(id, "sounds")

/** The Artfakta texts of a species (`artfakta`, `artfakta_error`). */
export const artfaktaOf = (id: string) => fetchPart(id, "artfakta")

/**
 * Fetches a species' recordings and the file of the first one ahead of time, so the comparison does not
 * wait for them. The browser keeps the file (see `loadAudio`), so it is there when the sonogram asks for it.
 */
export function prefetchSounds(id: string) {
  void soundsOf(id)
    .then((result) => {
      const first = result?.sounds?.recordings[0]
      if (first) void fetch(first.audio_url, { cache: "force-cache" }).catch(() => {})
    })
    .catch(() => {})
}
