"use client"

import { useEffect, useEffectEvent } from "react"
import type { Map as MaplibreMap } from "maplibre-gl"

// Runs `callback` once immediately, then again at most once per animation
// frame while any of `events` fires — several events landing in the same
// frame (e.g. "move" firing continuously during an animation) only trigger
// one callback run, not one per event.
export function useMapFrame(map: MaplibreMap, events: readonly string[], callback: () => void) {
  const onFrame = useEffectEvent(callback)
  const eventsKey = events.join(",")

  useEffect(() => {
    let frame: number | null = null
    const schedule = () => {
      if (frame !== null) return
      frame = requestAnimationFrame(() => {
        frame = null
        onFrame()
      })
    }
    schedule()
    const eventList = eventsKey.split(",")
    for (const event of eventList) map.on(event, schedule)
    return () => {
      if (frame !== null) cancelAnimationFrame(frame)
      for (const event of eventList) map.off(event, schedule)
    }
  }, [map, eventsKey])
}
