"use client"

import { useRef, useState, type FormEvent } from "react"
import { SearchField } from "@/app/tempus/forms/Fields"

export function PlaceSearch({ onPlace }: { onPlace: (place: { lng: number; lat: number; label: string }) => void }) {
  const [query, setQuery] = useState("")
  const [message, setMessage] = useState("")
  const controllerRef = useRef<AbortController | null>(null)
  const search = async (event: FormEvent) => {
    event.preventDefault()
    if (!query.trim()) return
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setMessage("Söker…")
    try {
      const response = await fetch(`/api/tempus/geocode?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      if (!response.ok) { setMessage("Platssökningen kunde inte nås."); return }
      const result = await response.json() as { results?: { lng: number; lat: number; label: string }[] }
      const place = result.results?.[0]
      if (!place) { setMessage("Ingen plats hittades."); return }
      onPlace(place)
      setMessage(place.label)
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return
      setMessage("Platssökningen kunde inte nås.")
    }
  }
  return <form onSubmit={search} className="absolute left-4 top-4 z-20 flex max-w-[calc(100%-13rem)] border border-[#4a3526]/70 bg-[#fbf8f0]/95 px-2 py-1 shadow-sm">
    <SearchField value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Sök ort eller adress" aria-label="Sök ort eller adress" className="w-44 sm:w-60" />
    <button type="submit" className="border-l border-[#4a3526]/50 px-2 font-display text-xs italic text-[#4a3526] hover:text-[#9a4c38]">Sök</button>
    {message ? <span className="sr-only" role="status">{message}</span> : null}
  </form>
}
