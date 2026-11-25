"use client"

import { useMemo, useSyncExternalStore } from "react"
import { useStored } from "@/app/lib/use-stored"

export type CompareSpecies = { id: string; name: string; scientificName?: string }

export const MIN_COMPARE = 2

// One ink per species, by its place in the list: the same on the sheet, in its legend and wherever the list is shown.
const INKS = ["--accent", "--secondary", "--warning"]
export const inkOf = (position: number) => INKS[position % INKS.length]
const KEY = "tempus:compare-species"

const parse = (stored: string | null): CompareSpecies[] => {
  if (!stored) return []
  try {
    const value: unknown = JSON.parse(stored)
    if (!Array.isArray(value)) return []
    return value.filter((item): item is CompareSpecies => typeof item?.id === "string" && typeof item?.name === "string")
  } catch {
    return []
  }
}

/** The species picked for the sound comparison, kept in the browser. */
export function useCompareSpecies() {
  const [stored, setStored] = useStored(KEY)
  const species = useMemo(() => parse(stored), [stored])
  // False until the browser's storage has been read, so a page does not show "nothing picked" first.
  const ready = useSyncExternalStore(() => () => {}, () => true, () => false)

  const add = (item: CompareSpecies) => {
    setStored(JSON.stringify([...species.filter((existing) => existing.id !== item.id), item]))
  }
  const replace = (items: CompareSpecies[]) => {
    setStored(items.length > 0 ? JSON.stringify(items) : null)
  }
  const remove = (id: string) => {
    const rest = species.filter((existing) => existing.id !== id)
    setStored(rest.length > 0 ? JSON.stringify(rest) : null)
  }

  return { species, ready, add, replace, remove, has: (id: string) => species.some((existing) => existing.id === id) }
}
