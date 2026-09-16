"use client"

import { useEffect, useRef } from "react"
import type { Map as MaplibreMap } from "maplibre-gl"

/**
 * Runs `callback` at most once per animation frame, re-scheduled whenever
 * any of `events` fires on `map` — coalesces a burst of events (every tick
 * of a pan/zoom animation, say) into a single update per frame instead of
 * running the callback once per event.
 *
 * The pending-frame id MUST be reset to null in cleanup, not just cancelled.
 * React StrictMode's dev-only mount → cleanup → mount cycle otherwise leaves
 * a stale non-null id behind (from the first, cancelled invocation) that the
 * second (real) invocation's `schedule()` sees as "already scheduled" —
 * every future call silently no-ops, forever, and the callback never runs
 * again. This was found the hard way in an early version of PlaceLabels;
 * both PlaceLabels and ObservationLabels share this hook specifically so
 * that fix doesn't have to be rediscovered per-file.
 */
export function useMapFrame(map: MaplibreMap, events: readonly string[], callback: () => void) {
  const frame = useRef<number | null>(null)
  const callbackRef = useRef(callback)
  callbackRef.current = callback
  const eventsKey = events.join(",")

  useEffect(() => {
    let disposed = false
    const activeEvents = eventsKey.split(",") as Parameters<MaplibreMap["on"]>[0][]

    const schedule = () => {
      if (frame.current !== null || disposed) return
      frame.current = requestAnimationFrame(() => {
        frame.current = null
        if (!disposed) callbackRef.current()
      })
    }

    for (const event of activeEvents) map.on(event, schedule)
    schedule()

    return () => {
      disposed = true
      for (const event of activeEvents) map.off(event, schedule)
      if (frame.current !== null) { cancelAnimationFrame(frame.current); frame.current = null }
    }
    // eventsKey (not `events`, a new array every render) is the real
    // dependency — it's stable across renders unless the event list itself
    // changes, which none of this hook's callers ever do at runtime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, eventsKey])
}
