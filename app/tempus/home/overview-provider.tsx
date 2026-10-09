"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { useSearchParams } from "next/navigation"
import { overviewResources, resourceKey, type OverviewResource, type OverviewResources } from "./resources"
import type { OverviewSeed } from "./seed"
import { changeSelection, parseSelection, selectionHref, type Selection, type SelectionChange } from "./selection"

type OverviewContextValue = {
  isGuest: boolean
  selection: Selection
  resources: OverviewResources
  // Changes the selection in the browser: the URL follows, the page is not loaded again.
  select: (change: SelectionChange) => void
  hrefFor: (change: SelectionChange) => string
  // A read that has already arrived, or undefined.
  peek: <T>(resource: OverviewResource<T>) => T | undefined
  read: <T>(resource: OverviewResource<T>) => Promise<T>
}

const OverviewContext = createContext<OverviewContextValue | null>(null)

async function fetchResource<T>(resource: OverviewResource<T>): Promise<T> {
  const params = new URLSearchParams(Object.entries(resource.query).map(([name, value]) => [name, String(value)]))
  if (resource.shared) params.set("shared", "1")
  const response = await fetch(`/api/tempus/species/${resource.endpoint}?${params}`, { cache: "no-store" })
  if (!response.ok) throw new Error(`Säsongsöversikten svarade ${response.status}`)
  return (await response.json()) as T
}

// Holds the start page's selection and every read made for it. The server sends
// along what the first selection shows; anything else is fetched when a choice
// asks for it, once, and kept for as long as the page is open.
export function OverviewProvider({
  geoAreaId,
  isGuest,
  seed,
  children,
}: {
  geoAreaId: string | null
  isGuest: boolean
  seed: OverviewSeed
  children: ReactNode
}) {
  const searchParams = useSearchParams()
  const selection = useMemo(() => parseSelection((name) => searchParams.get(name), isGuest), [searchParams, isGuest])
  const resources = useMemo(() => overviewResources(geoAreaId), [geoAreaId])

  const [store] = useState(() => ({
    arrived: new Map<string, unknown>(),
    pending: new Map<string, Promise<unknown>>(),
  }))
  // A fresh render from the server brings fresh reads.
  useMemo(() => {
    for (const [key, data] of seed) store.arrived.set(key, data)
  }, [seed, store])

  const peek = useCallback(
    <T,>(resource: OverviewResource<T>) => store.arrived.get(resourceKey(resource)) as T | undefined,
    [store],
  )

  const read = useCallback(
    <T,>(resource: OverviewResource<T>): Promise<T> => {
      const key = resourceKey(resource)
      if (store.arrived.has(key)) return Promise.resolve(store.arrived.get(key) as T)
      let pending = store.pending.get(key) as Promise<T> | undefined
      if (!pending) {
        pending = fetchResource(resource)
          .then((data) => {
            store.arrived.set(key, data)
            return data
          })
          // A failed read is not kept, so the next choice tries again.
          .catch(() => resource.empty)
          .finally(() => store.pending.delete(key))
        store.pending.set(key, pending)
      }
      return pending
    },
    [store],
  )

  const hrefFor = useCallback((change: SelectionChange) => selectionHref(changeSelection(selection, change)), [selection])
  const select = useCallback(
    (change: SelectionChange) => window.history.pushState(null, "", hrefFor(change)),
    [hrefFor],
  )

  const value = useMemo(
    () => ({ isGuest, selection, resources, select, hrefFor, peek, read }),
    [isGuest, selection, resources, select, hrefFor, peek, read],
  )

  return <OverviewContext.Provider value={value}>{children}</OverviewContext.Provider>
}

export function useOverview() {
  const context = useContext(OverviewContext)
  if (!context) throw new Error("useOverview måste användas inom OverviewProvider")
  return context
}

// One read. While a new one is on its way the previous answer stays up, marked
// as loading, so the page never empties between two choices. A null resource
// reads nothing.
export function useOverviewResource<T>(resource: OverviewResource<T> | null): { data: T | null; loading: boolean } {
  const { peek, read } = useOverview()
  const key = resource ? resourceKey(resource) : null
  const [last, setLast] = useState<{ key: string; data: T } | null>(null)

  useEffect(() => {
    if (!resource || !key) return
    let cancelled = false
    read(resource).then((data) => {
      if (!cancelled) setLast({ key, data })
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `resource` is represented by `key`
  }, [key, read])

  if (!resource || !key) return { data: null, loading: false }
  const arrived = peek(resource)
  if (arrived !== undefined) return { data: arrived, loading: false }
  if (last?.key === key) return { data: last.data, loading: false }
  return { data: last?.data ?? null, loading: true }
}
