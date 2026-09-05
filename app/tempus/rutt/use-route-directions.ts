"use client"

import { useEffect, useMemo, useRef } from "react"
import { useMapsLibrary } from "@vis.gl/react-google-maps"
import type { RouteLineString } from "@/app/lib/schemas"

type LonLat = [number, number]

export type PlannedRoute = {
  geometry: RouteLineString
  distanceMetres: number
  durationSeconds: number
  summary: string
}

export type Endpoint = { description: string; location: LonLat } | null

// Google's route path can carry hundreds of vertices. Thin it so the stored
// LineString stays a reasonable payload while still tracing the road closely.
const MAX_GEOMETRY_POINTS = 250

function thin(path: google.maps.LatLngAltitude[]): LonLat[] {
  if (path.length <= MAX_GEOMETRY_POINTS) {
    return path.map((point) => [point.lng, point.lat])
  }
  const step = (path.length - 1) / (MAX_GEOMETRY_POINTS - 1)
  const out: LonLat[] = []
  for (let index = 0; index < MAX_GEOMETRY_POINTS; index += 1) {
    const point = path[Math.round(index * step)]!
    out.push([point.lng, point.lat])
  }
  return out
}

/** Computes a route whenever the endpoints change. */
export function useDirections(
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
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  const stops = useMemo(
    () => waypoints.filter((point): point is NonNullable<Endpoint> => point != null),
    [waypoints],
  )

  useEffect(() => {
    if (!routesLibrary) return
    if (!origin || !destination) return

    handlersRef.current.onPending()
    let cancelled = false
    routesLibrary.Route
      .computeRoutes({
        origin: { lat: origin.location[1], lng: origin.location[0] },
        destination: { lat: destination.location[1], lng: destination.location[0] },
        intermediates: stops.map((stop) => ({
          location: { lat: stop.location[1], lng: stop.location[0] },
        })),
        travelMode: routesLibrary.TravelMode.DRIVING,
        fields: ["path", "distanceMeters", "durationMillis", "description"],
      })
      .then((response) => {
        if (cancelled) return
        const route = response.routes?.[0]
        const path = route?.path ?? []
        if (!route || path.length < 2) {
          handlersRef.current.onError("Rutten saknar geometri. Prova andra punkter.")
          return
        }
        handlersRef.current.onResult({
          geometry: { type: "LineString", coordinates: thin(path) },
          distanceMetres: route.distanceMeters ?? 0,
          durationSeconds: Math.round((route.durationMillis ?? 0) / 1000),
          summary: route.description || "",
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
  }, [routesLibrary, origin, destination, stops])
}
