"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  deleteRoute,
  deleteRouteStop,
  pollSuggestedStops,
  startSuggestedStops,
  type SuggestedStopsParams,
} from "@/app/tempus/_actions/routes"
import { useConfirmDialog } from "@/app/components/ui/useConfirmDialog"
import type { TempusSuggestedStopsRun } from "@/app/lib/dal"
import type {
  TempusRoute,
  TempusRouteStop,
  TempusSuggestedStop,
} from "@/app/lib/dal"
import { type RouteMapMarker } from "./route-map"
import { googleMapsDirectionsUrl } from "./route-detail/shared"
import { RouteTopBar, RouteHeader } from "./route-detail/route-header"
import { RouteStops } from "./route-detail/route-stops"
import { RouteSuggestions, type RouteSearchParams } from "./route-detail/route-suggestions"

export default function RouteDetail({
  route,
  stops,
}: {
  route: TempusRoute
  stops: TempusRouteStop[]
}) {
  const router = useRouter()
  const [suggestions, setSuggestions] = useState<TempusSuggestedStop[]>([])
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mutating, startMutation] = useTransition()
  const { requestConfirm, dialog } = useConfirmDialog()

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelled = useRef(false)

  useEffect(
    () => () => {
      cancelled.current = true
      if (pollTimer.current) clearTimeout(pollTimer.current)
    },
    [],
  )

  const routePoints = route.geometry?.coordinates.length ?? 0
  const mapsUrl = useMemo(
    () => googleMapsDirectionsUrl(route, stops),
    [route, stops],
  )

  const suggestionMarkers = useMemo<RouteMapMarker[]>(
    () =>
      suggestions.map((stop) => ({
        id: `rank-${stop.rank}`,
        coordinates: stop.location.coordinates,
        label: `${stop.rank}. ${stop.locality || "Område"}`,
        rank: stop.rank,
      })),
    [suggestions],
  )

  const notifyReady = (count: number) => {
    if (typeof window === "undefined" || !("Notification" in window)) return
    if (Notification.permission !== "granted") return
    // Only worth a notification if the user has looked away while it ran.
    if (typeof document !== "undefined" && document.visibilityState === "visible") return
    new Notification("Stoppställen klara", {
      body: count
        ? `${count} förslag för ${route.name}`
        : `Inga stopp klarade ribban för ${route.name}`,
    })
  }

  const applyRun = (run: TempusSuggestedStopsRun) => {
    if (run.status === "succeeded") {
      setSuggestions(run.result)
      setLoading(false)
      notifyReady(run.result.length)
      return
    }
    if (run.status === "failed") {
      setError(run.error || "Sökningen misslyckades. Försök igen om en stund.")
      setSuggestions([])
      setLoading(false)
      return
    }
    // pending | running — keep polling
    pollTimer.current = setTimeout(async () => {
      if (cancelled.current) return
      const result = await pollSuggestedStops(route.id)
      if (cancelled.current) return
      if (result.error || !result.data) {
        setError(result.error ?? "Något gick fel.")
        setLoading(false)
        return
      }
      applyRun(result.data)
    }, 3000)
  }

  const runSearch = async (searchParams: RouteSearchParams) => {
    if (loading) return
    const retryAfterError = error !== null
    setError(null)
    setLoading(true)
    cancelled.current = false
    if (pollTimer.current) clearTimeout(pollTimer.current)

    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      void Notification.requestPermission()
    }

    const params: SuggestedStopsParams = { ...searchParams, refresh: retryAfterError }

    const result = await startSuggestedStops(route.id, params)
    if (cancelled.current) return
    setSearched(true)
    if (result.error || !result.data) {
      setError(result.error ?? "Något gick fel.")
      setSuggestions([])
      setLoading(false)
      return
    }
    applyRun(result.data)
  }

  const removeStop = (stopId: string) => {
    startMutation(async () => {
      await deleteRouteStop(route.id, stopId)
      router.refresh()
    })
  }

  const removeRoute = () => {
    requestConfirm({
      title: "Ta bort rutt",
      message: `Ta bort rutten "${route.name}"? Det går inte att ångra.`,
      confirmLabel: "Ta bort",
      destructive: true,
      onConfirm: () => {
        startMutation(async () => {
          const result = await deleteRoute(route.id)
          if (result.error) {
            setError(result.error)
            return
          }
          router.push("/rutt")
        })
      },
    })
  }

  return (
    <div className="container mx-auto max-w-4xl py-5 max-sm:px-3 sm:py-7">
      <RouteTopBar mapsUrl={mapsUrl} mutating={mutating} onRemoveRoute={removeRoute} />

      <article className="overflow-hidden rounded-card border border-border bg-surface text-text">
        <RouteHeader route={route} routePoints={routePoints} stopsCount={stops.length} />

        <section className="px-3 pb-4 sm:px-5 sm:pb-6">
          <RouteStops
            route={route}
            stops={stops}
            suggestionMarkers={suggestionMarkers}
            activeId={activeId}
            mutating={mutating}
            onRemoveStop={removeStop}
          />

          <RouteSuggestions
            routeId={route.id}
            corridorMetres={route.corridor_metres}
            onSearch={runSearch}
            loading={loading}
            error={error}
            searched={searched}
            suggestions={suggestions}
            activeId={activeId}
            onFocusSuggestion={setActiveId}
            onSuggestionAdded={() => router.refresh()}
          />
        </section>
      </article>
      {dialog}
    </div>
  )
}
