"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  APIProvider,
  useApiIsLoaded,
  useMapsLibrary,
} from "@vis.gl/react-google-maps"
import { Button } from "@/app/components/ui/Button"
import { SwedenMap } from "@/app/tempus/ui/biotope-map/SwedenMap"
import { GOOGLE_MAPS_API_KEY } from "@/app/lib/config"
import type { RouteLineString } from "@/app/lib/schemas"
import { createRouteProjection } from "./projection"

type LonLat = [number, number]

export type PlannedRoute = {
  geometry: RouteLineString
  distanceMetres: number
  durationSeconds: number
  summary: string
}

// Google's overview_path can carry hundreds of vertices. Thin it so the stored
// LineString stays a reasonable payload while still tracing the road closely.
const MAX_GEOMETRY_POINTS = 250

function thin(path: google.maps.LatLng[]): LonLat[] {
  if (path.length <= MAX_GEOMETRY_POINTS) {
    return path.map((point) => [point.lng(), point.lat()])
  }
  const step = (path.length - 1) / (MAX_GEOMETRY_POINTS - 1)
  const out: LonLat[] = []
  for (let index = 0; index < MAX_GEOMETRY_POINTS; index += 1) {
    const point = path[Math.round(index * step)]!
    out.push([point.lng(), point.lat()])
  }
  return out
}

function formatKm(metres: number) {
  return `${(metres / 1000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })} km`
}

function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  return `${hours} h ${minutes % 60} min`
}

type Endpoint = { description: string; location: LonLat } | null

/** A text input wired to Google Places Autocomplete, biased to Sweden. */
function PlaceField({
  label,
  value,
  onResolved,
  onCleared,
  disabled,
  placeholder,
}: {
  label: string
  value: string
  onResolved: (place: { description: string; location: LonLat }) => void
  onCleared: () => void
  disabled?: boolean
  placeholder?: string
}) {
  const places = useMapsLibrary("places")
  const inputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState(value)
  const onResolvedRef = useRef(onResolved)
  onResolvedRef.current = onResolved

  useEffect(() => {
    setText(value)
  }, [value])

  useEffect(() => {
    if (!places || !inputRef.current) return
    const autocomplete = new places.Autocomplete(inputRef.current, {
      fields: ["geometry", "formatted_address", "name"],
      componentRestrictions: { country: "se" },
    })
    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace()
      const point = place.geometry?.location
      if (!point) return
      const description = place.formatted_address || place.name || ""
      setText(description)
      onResolvedRef.current({ description, location: [point.lng(), point.lat()] })
    })
    return () => listener.remove()
  }, [places])

  return (
    <label className="flex flex-col border-b border-r border-border px-3 py-2 font-display text-[9px] italic text-text-faint">
      {label}
      <input
        ref={inputRef}
        type="text"
        value={text}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => {
          setText(event.target.value)
          if (!event.target.value.trim()) onCleared()
        }}
        onKeyDown={(event) => {
          // Don't let Enter (incl. picking an autocomplete row) submit the form.
          if (event.key === "Enter") event.preventDefault()
        }}
        className="mt-1 h-9 rounded border border-field-border bg-surface px-2.5 font-body text-xs not-italic text-text placeholder:text-text-faint focus:border-accent focus:outline-none disabled:opacity-50"
      />
    </label>
  )
}

/** Renders the planned route line over the Sweden map, matching RouteMap. */
function RoutePreview({
  geometry,
  endpoints,
  width = 460,
  height = 690,
  padding = 24,
}: {
  geometry: RouteLineString | null
  endpoints: LonLat[]
  width?: number
  height?: number
  padding?: number
}) {
  const projection = useMemo(
    () => createRouteProjection(width, height, padding),
    [width, height, padding],
  )
  const linePoints =
    geometry && geometry.coordinates.length > 1
      ? geometry.coordinates.map((position) => projection.toMap(position))
      : []

  return (
    <div className="relative overflow-hidden rounded border border-border">
      <SwedenMap
        width={width}
        height={height}
        padding={padding}
        className="block h-auto w-full"
      />
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="absolute inset-0 h-full w-full text-accent"
        aria-hidden
      >
        {linePoints.length > 1 ? (
          <polyline
            points={linePoints.map(([x, y]) => `${x},${y}`).join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
        {endpoints.map((position, index) => {
          const [x, y] = projection.toMap(position)
          return (
            <circle
              key={`${position[0]}-${position[1]}-${index}`}
              cx={x}
              cy={y}
              r={5}
              fill="currentColor"
              stroke="var(--surface, white)"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
          )
        })}
      </svg>
    </div>
  )
}

/** Runs the headless Directions request whenever the endpoints change. */
function useDirections(
  origin: Endpoint,
  destination: Endpoint,
  waypoints: Endpoint[],
  handlers: {
    onResult: (route: PlannedRoute) => void
    onError: (message: string) => void
    onPending: () => void
  },
) {
  const routesLibrary = useMapsLibrary("routes")
  const [service, setService] = useState<google.maps.DirectionsService>()
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    if (!routesLibrary) return
    setService(new routesLibrary.DirectionsService())
  }, [routesLibrary])

  const stops = useMemo(
    () => waypoints.filter((point): point is NonNullable<Endpoint> => point != null),
    [waypoints],
  )

  useEffect(() => {
    if (!service) return
    if (!origin || !destination) return

    handlersRef.current.onPending()
    let cancelled = false
    service
      .route({
        origin: { lat: origin.location[1], lng: origin.location[0] },
        destination: { lat: destination.location[1], lng: destination.location[0] },
        waypoints: stops.map((stop) => ({
          location: { lat: stop.location[1], lng: stop.location[0] },
          stopover: true,
        })),
        travelMode: google.maps.TravelMode.DRIVING,
      })
      .then((response) => {
        if (cancelled) return
        const route = response.routes[0]
        const path = route?.overview_path ?? []
        if (!route || path.length < 2) {
          handlersRef.current.onError("Rutten saknar geometri. Prova andra punkter.")
          return
        }
        const distanceMetres = route.legs.reduce(
          (sum, part) => sum + (part.distance?.value ?? 0),
          0,
        )
        const durationSeconds = route.legs.reduce(
          (sum, part) => sum + (part.duration?.value ?? 0),
          0,
        )
        handlersRef.current.onResult({
          geometry: { type: "LineString", coordinates: thin(path) },
          distanceMetres,
          durationSeconds,
          summary: route.summary || "",
        })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const status =
          typeof error === "object" && error && "code" in error
            ? String((error as { code: unknown }).code)
            : ""
        handlersRef.current.onError(
          status === "ZERO_RESULTS"
            ? "Ingen körväg hittades mellan punkterna."
            : "Kunde inte hämta rutten från Google. Försök igen.",
        )
      })

    return () => {
      cancelled = true
    }
  }, [service, origin, destination, stops])
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
        <span className="font-display text-xs italic text-text-faint" aria-live="polite">
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

      <p className="font-display text-[11px] italic leading-5 text-text-muted">
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
