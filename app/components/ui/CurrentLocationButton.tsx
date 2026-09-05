"use client"

import { useState } from "react"
import { Button } from "@/app/components/ui/Button"
import { CrosshairIcon, LoaderIcon } from "lucide-react"

export type GeolocationCoords = {
  latitude: number
  longitude: number
  accuracy: number
}

type Props = {
  onLocate: (coords: GeolocationCoords) => void
  onError?: (message: string) => void
  label?: string
  pendingLabel?: string
  className?: string
  size?: "sm" | "md"
  disabled?: boolean
  highAccuracy?: boolean
}

/**
 * Shared "use my current location" trigger built on the browser Geolocation API.
 * Headless about what a location means — hands the caller raw coordinates and
 * lets each form map them (a formatted string, a lat/lon pair, …). Used by
 * Tempus observations and Apsis uploads.
 */
export function CurrentLocationButton({
  onLocate,
  onError,
  label = "Min plats",
  pendingLabel = "Hämtar plats…",
  className = "",
  size = "md",
  disabled = false,
  highAccuracy = true,
}: Props) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fail = (message: string) => {
    setPending(false)
    if (onError) onError(message)
    else setError(message)
  }

  const locate = () => {
    setError(null)
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      fail("Platstjänster stöds inte i den här webbläsaren.")
      return
    }
    setPending(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPending(false)
        onLocate({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
      },
      (positionError) => {
        const messages: Record<number, string> = {
          1: "Åtkomst till plats nekades.",
          2: "Platsen kunde inte fastställas.",
          3: "Tidsgränsen för platsförfrågan överskreds.",
        }
        fail(messages[positionError.code] ?? "Platsen kunde inte hämtas.")
      },
      { enableHighAccuracy: highAccuracy, timeout: 15000, maximumAge: 60000 },
    )
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size={size}
        className={`whitespace-nowrap ${className}`}
        onClick={locate}
        disabled={disabled || pending}
      >
        {pending ? (
          <LoaderIcon size={15} className="animate-spin" />
        ) : (
          <CrosshairIcon size={15} />
        )}
        {pending ? pendingLabel : label}
      </Button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </>
  )
}
