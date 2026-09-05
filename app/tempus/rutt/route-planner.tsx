"use client"

import { useCallback, useMemo, useState } from "react"
import { APIProvider, useApiIsLoaded } from "@vis.gl/react-google-maps"
import { Button } from "@/app/components/ui/Button"
import { GOOGLE_MAPS_API_KEY } from "@/app/lib/config"
import { formatKm } from "@/app/tempus/formatters"
import { PlaceField } from "./place-field"
import { RoutePreview } from "./route-preview"
import { useDirections, type Endpoint, type PlannedRoute } from "./use-route-directions"

export type { PlannedRoute }

function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  return `${hours} h ${minutes % 60} min`
}

function PlannerBody({
  onRouteChange,
  disabled,
}: {
  onRouteChange: (route: PlannedRoute | null) => void
  disabled: boolean
}) {
  const apiLoaded = useApiIsLoaded()
  const [origin, setOrigin] = useState<Endpoint>(null)
  const [destination, setDestination] = useState<Endpoint>(null)
  const [waypoints, setWaypoints] = useState<Endpoint[]>([])
  const [status, setStatus] = useState<"idle" | "pending" | "ready" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const [planned, setPlanned] = useState<PlannedRoute | null>(null)

  const onResult = useCallback(
    (route: PlannedRoute) => {
      setPlanned(route)
      setStatus("ready")
      setError(null)
      onRouteChange(route)
    },
    [onRouteChange],
  )
  const onError = useCallback(
    (message: string) => {
      setStatus("error")
      setError(message)
      setPlanned(null)
      onRouteChange(null)
    },
    [onRouteChange],
  )
  const onPending = useCallback(() => {
    setStatus("pending")
    setError(null)
  }, [])

  useDirections(origin, destination, waypoints, { onResult, onError, onPending })

  const setWaypoint = (index: number, point: Endpoint) => {
    setWaypoints((current) => current.map((value, i) => (i === index ? point : value)))
  }

  const endpoints = useMemo(
    () =>
      [origin, ...waypoints, destination]
        .filter((point): point is NonNullable<Endpoint> => point != null)
        .map((point) => point.location),
    [origin, destination, waypoints],
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="grid border-l border-t border-border sm:grid-cols-2">
        <PlaceField
          label="Från"
          value={origin?.description ?? ""}
          disabled={disabled}
          placeholder="T.ex. Stockholm C"
          onResolved={setOrigin}
          onCleared={() => setOrigin(null)}
        />
        <PlaceField
          label="Till"
          value={destination?.description ?? ""}
          disabled={disabled}
          placeholder="T.ex. Uppsala"
          onResolved={setDestination}
          onCleared={() => setDestination(null)}
        />

        {waypoints.map((waypoint, index) => (
          <div
            key={index}
            className="flex items-end border-b border-r border-border sm:col-span-2"
          >
            <div className="flex-1">
              <PlaceField
                label={`Via ${index + 1}`}
                value={waypoint?.description ?? ""}
                disabled={disabled}
                placeholder="Delmål längs vägen"
                onResolved={(place) => setWaypoint(index, place)}
                onCleared={() => setWaypoint(index, null)}
              />
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                setWaypoints((current) => current.filter((_, i) => i !== index))
              }
              aria-label={`Ta bort via ${index + 1}`}
              className="mb-2 mr-3 px-2 font-display text-lg italic text-text-faint hover:text-danger disabled:opacity-50"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled || waypoints.length >= 8}
          onClick={() => setWaypoints((current) => [...current, null])}
        >
          Lägg till delmål
        </Button>
        <span className="font-display text-sm italic text-text-faint" aria-live="polite">
          {!apiLoaded
            ? "Laddar Google Maps…"
            : status === "pending"
              ? "Hämtar körväg från Google…"
              : status === "ready" && planned
                ? `${formatKm(planned.distanceMetres)} · ${formatDuration(
                    planned.durationSeconds,
                  )}${planned.summary ? ` · via ${planned.summary}` : ""}`
                : "Ange från och till för att planera rutten"}
        </span>
      </div>

      {error ? (
        <p
          className="rounded bg-danger-wash px-3 py-2 font-display text-sm italic text-danger"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <RoutePreview geometry={planned?.geometry ?? null} endpoints={endpoints} />

      <p className="font-display text-sm italic leading-6 text-text-muted">
        Google beräknar körvägen mellan punkterna. Den lagrade ruttlinjen följer
        vägnätet — sökkorridoren läggs sedan runt den.
      </p>
    </div>
  )
}

export function RoutePlanner({
  onRouteChange,
  disabled = false,
}: {
  onRouteChange: (route: PlannedRoute | null) => void
  disabled?: boolean
}) {
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <p className="rounded border border-border bg-surface-2/40 px-3 py-3 font-display text-xs italic text-text-muted">
        Sätt <code className="not-italic">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> för att
        planera rutten med Google Maps.
      </p>
    )
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={["places", "routes"]}>
      <PlannerBody onRouteChange={onRouteChange} disabled={disabled} />
    </APIProvider>
  )
}
