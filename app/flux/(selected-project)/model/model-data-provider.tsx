"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { FluxDesign, FluxScaffold, FluxScaffoldTarget } from "@/app/lib/dal"
import { loadScaffold } from "./api/_actions/scaffold"

type ModelData = { projectId: string; projectName: string; design: FluxDesign }

type ScaffoldState = { scaffold: FluxScaffold | null; loading: boolean }

type ModelDataContextValue = {
  data: ModelData | null
  getScaffold: (target: FluxScaffoldTarget, files?: string[]) => Promise<FluxScaffold | null>
}

const ModelDataContext = createContext<ModelDataContextValue | null>(null)

export function ModelDataProvider({ data, children }: { data: ModelData | null; children: ReactNode }) {
  // ModelLayout re-fetches the design on every navigation, so `data` is a new reference each time —
  // this cache never survives across navigations, only within one page's lifetime (e.g. switching
  // target tabs without leaving the page). That's fine as long as each entry only asks for the
  // specific file(s) a view actually needs (pass `files`) rather than a whole target's file bundle,
  // which is what makes a cache miss on every navigation cheap instead of a real problem to solve.
  const cache = useMemo(() => new Map<string, Promise<FluxScaffold | null>>(), [data])

  const getScaffold = useCallback((target: FluxScaffoldTarget, files?: string[]) => {
    if (!data) return Promise.resolve(null)
    const key = files?.length ? `${target}:${files.join(",")}` : target
    let pending = cache.get(key)
    if (!pending) {
      pending = loadScaffold(data.projectId, target, files).catch(() => null)
      cache.set(key, pending)
    }
    return pending
  }, [cache, data])

  const value = useMemo(() => ({ data, getScaffold }), [data, getScaffold])

  return <ModelDataContext.Provider value={value}>{children}</ModelDataContext.Provider>
}

function useModelContext() {
  const context = useContext(ModelDataContext)
  if (!context) throw new Error("useModelData måste användas inom ModelDataProvider")
  return context
}

export function useModelData() {
  return useModelContext().data
}

export function useScaffold(target: FluxScaffoldTarget, files?: string[]): ScaffoldState {
  const { getScaffold } = useModelContext()
  const filesKey = files?.join(",")
  const [state, setState] = useState<ScaffoldState & { key?: string }>({ scaffold: null, loading: true })

  useEffect(() => {
    let cancelled = false
    getScaffold(target, files).then((scaffold) => {
      if (!cancelled) setState({ scaffold, loading: false, key: `${target}:${filesKey ?? ""}` })
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `files` is represented by `filesKey`
  }, [getScaffold, target, filesKey])

  return state.key === `${target}:${filesKey ?? ""}` ? state : { scaffold: state.scaffold, loading: true }
}
