"use client"

import { useEffect, useRef, useState } from "react"
import { BIRDNET_STREAM_PATH } from "@/app/lib/config"

/**
 * One `event: detection` frame off the BirdNET stream. Key casing is mixed —
 * `detectedAt` is camelCase, the rest snake_case. That is the backend contract;
 * see docs/tempus/birdnet/api.md.
 */
/**
 * The Dyntaxa taxon the raw BirdNET label was matched to. Null when the label
 * could not be resolved (unknown species, sub-species BirdNET emits that we
 * don't carry, etc.) — fall back to `species` then.
 */
export type BirdnetMatchedSpecies = {
  id: string
  dyntaxa_taxon_id: number
  scientific_name: string
  swedish_name: string
}

export type BirdnetDetection = {
  id: string // detection uuid — use as React key and for dedup
  species: string // raw BirdNET scientific label, e.g. "Turdus merula" (not localised)
  matched_species: BirdnetMatchedSpecies | null // resolved Dyntaxa taxon, or null
  confidence: number // 0..1
  detectedAt: string // ISO 8601 — when the device heard the bird
  device_id: string // device identifier, e.g. "pi-birdnet-001"
  created_at: string // ISO 8601 — when the server stored the row
}

export type BirdnetStreamState = {
  detections: BirdnetDetection[]
  connected: boolean
}

type Options = {
  // Backfill on first connect, 0..86400 (seconds). 86400 = the full retained
  // window. Ignored on automatic reconnects (the browser resumes via Last-Event-ID).
  replaySeconds?: number
  // Cap the in-memory list.
  max?: number
  // Set false to hold the stream closed (e.g. no devices registered yet).
  enabled?: boolean
}

function isMatchedSpeciesOrNull(value: unknown): value is BirdnetMatchedSpecies | null {
  if (value === null) return true
  if (!value || typeof value !== "object") return false
  const m = value as Record<string, unknown>
  return (
    typeof m.id === "string" &&
    typeof m.dyntaxa_taxon_id === "number" &&
    typeof m.scientific_name === "string" &&
    typeof m.swedish_name === "string"
  )
}

function isDetection(value: unknown): value is BirdnetDetection {
  if (!value || typeof value !== "object") return false
  const d = value as Record<string, unknown>
  return (
    typeof d.id === "string" &&
    typeof d.species === "string" &&
    isMatchedSpeciesOrNull(d.matched_species) &&
    typeof d.confidence === "number" &&
    typeof d.detectedAt === "string" &&
    typeof d.device_id === "string" &&
    typeof d.created_at === "string"
  )
}

/**
 * Subscribes to the merged BirdNET detection stream for every device the
 * logged-in user can see. Handles backfill, dedup, a bounded list and
 * connection state. Reconnection is the browser's job — never tear the
 * EventSource down and rebuild it yourself.
 */
export function useBirdnetStream({
  replaySeconds = 0,
  max = 500,
  enabled = true,
}: Options = {}): BirdnetStreamState {
  const [detections, setDetections] = useState<BirdnetDetection[]>([])
  const [connected, setConnected] = useState(false)
  const seen = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!enabled) {
      setDetections([])
      setConnected(false)
      seen.current = new Set()
      return
    }

    const url = new URL(BIRDNET_STREAM_PATH, window.location.origin)
    if (replaySeconds > 0) {
      url.searchParams.set("replay_seconds", String(Math.min(replaySeconds, 86400)))
    }

    const es = new EventSource(url, { withCredentials: true })

    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false) // browser auto-reconnects

    es.addEventListener("detection", (event) => {
      let parsed: unknown
      try {
        parsed = JSON.parse((event as MessageEvent<string>).data)
      } catch {
        return
      }
      if (!isDetection(parsed) || seen.current.has(parsed.id)) return
      seen.current.add(parsed.id)
      setDetections((prev) => {
        const next = [parsed, ...prev].slice(0, max)
        if (seen.current.size > max * 4) {
          seen.current = new Set(next.map((d) => d.id))
        }
        return next
      })
    })

    return () => es.close()
  }, [replaySeconds, max, enabled])

  return { detections, connected }
}

export function groupDetectionsByDevice(
  detections: BirdnetDetection[]
): Map<string, BirdnetDetection[]> {
  const groups = new Map<string, BirdnetDetection[]>()
  for (const detection of detections) {
    const bucket = groups.get(detection.device_id)
    if (bucket) bucket.push(detection)
    else groups.set(detection.device_id, [detection])
  }
  return groups
}
