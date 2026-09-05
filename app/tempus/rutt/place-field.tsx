"use client"

import { useEffect, useRef } from "react"
import { useMapsLibrary } from "@vis.gl/react-google-maps"

type LonLat = [number, number]

/** Google's autocomplete widget, restricted to Swedish results. */
export function PlaceField({
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
  const mountRef = useRef<HTMLDivElement>(null)
  const autocompleteRef = useRef<google.maps.places.PlaceAutocompleteElement>(null)
  const onResolvedRef = useRef(onResolved)
  const onClearedRef = useRef(onCleared)
  onResolvedRef.current = onResolved
  onClearedRef.current = onCleared

  useEffect(() => {
    if (!places || !mountRef.current) return
    const autocomplete = new places.PlaceAutocompleteElement({
      includedRegionCodes: ["se"],
      requestedLanguage: "sv",
      requestedRegion: "se",
      noInputIcon: true,
    })
    const listenerController = new AbortController()
    autocomplete.className = "mt-1 block h-10 w-full rounded border border-field-border bg-surface px-2.5 font-body text-sm not-italic text-text disabled:opacity-50"
    autocomplete.style.colorScheme = "light"

    const handleSelect = async (event: google.maps.places.PlacePredictionSelectEvent) => {
      const place = event.placePrediction.toPlace()
      await place.fetchFields({ fields: ["displayName", "formattedAddress", "location"] })
      const point = place.location
      if (!point) return
      const description = place.formattedAddress || place.displayName || ""
      autocomplete.value = description
      onResolvedRef.current({ description, location: [point.lng(), point.lat()] })
    }
    const handleInput = () => {
      if (!autocomplete.value.trim()) onClearedRef.current()
    }

    autocomplete.addEventListener("gmp-select", handleSelect, { signal: listenerController.signal })
    autocomplete.addEventListener("input", handleInput, { signal: listenerController.signal })
    mountRef.current.appendChild(autocomplete)
    autocompleteRef.current = autocomplete

    return () => {
      listenerController.abort()
      autocomplete.remove()
      autocompleteRef.current = null
    }
  }, [places])

  useEffect(() => {
    const autocomplete = autocompleteRef.current
    if (!autocomplete) return
    autocomplete.value = value
    autocomplete.disabled = disabled ?? false
    autocomplete.placeholder = placeholder ?? ""
    autocomplete.description = label
  }, [disabled, label, placeholder, value])

  return (
    <label className="flex flex-col border-b border-r border-border px-3 py-2 font-display text-sm italic text-text-faint">
      {label}
      <div
        ref={mountRef}
        onKeyDown={(event) => {
          // Don't let Enter (incl. picking an autocomplete row) submit the form.
          if (event.key === "Enter") event.preventDefault()
        }}
      />
    </label>
  )
}
