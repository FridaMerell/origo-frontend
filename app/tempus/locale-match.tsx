"use client"

import { useTempusLocales } from "@/app/tempus/_state/tempus-context"
import { localeContainsPoint, localeRepresentativePoint, localesAtPoint } from "@/app/tempus/locales"

export function LocaleMatch({ lat, lon, compact = false }: { lat: string; lon: string; compact?: boolean }) {
  const locales = useTempusLocales()
  const latitude = Number(lat)
  const longitude = Number(lon)
  const matches = lat.trim() && lon.trim() ? localesAtPoint(locales, longitude, latitude) : []

  if (!lat.trim() || !lon.trim()) return null

  return (
    <p className={compact ? "text-xs text-text-muted" : "mt-2 text-xs text-text-muted"} aria-live="polite">
      {matches.length > 0
        ? <>Plats: <strong className="font-medium text-text">{matches.map((locale) => locale.name).join(", ")}</strong></>
        : "Positionen ligger inte i någon sparad plats."}
    </p>
  )
}

/**
 * The locale an observation is logged to: the explicit `choice` ("" for none),
 * or while nothing is chosen, the first locale the position lies in.
 */
export function useObservationLocale(lat: string, lon: string, choice: string | null) {
  const locales = useTempusLocales()
  const hasPosition = Boolean(lat.trim() && lon.trim())
  const matches = hasPosition ? localesAtPoint(locales, Number(lon), Number(lat)) : []
  const localeId = choice ?? String(matches[0]?.id ?? "")
  const locale = locales.find((item) => String(item.id) === localeId) ?? null
  const outside = Boolean(locale && hasPosition && !localeContainsPoint(locale, [Number(lon), Number(lat)]))
  return { locales, hasPosition, localeId, outside }
}

export function LocaleField({
  lat,
  lon,
  choice,
  onChoose,
  onPositionChange,
}: {
  lat: string
  lon: string
  /** The explicitly chosen locale id ("" for none), or null to follow the position. */
  choice: string | null
  onChoose: (localeId: string) => void
  onPositionChange: (coords: { lat: string; lon: string }) => void
}) {
  const { locales, hasPosition, localeId, outside } = useObservationLocale(lat, lon, choice)

  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      Plats
      <select
        value={localeId}
        onChange={(event) => {
          onChoose(event.target.value)
          // Without a position the observation gets a point inside the chosen locale.
          if (hasPosition) return
          const locale = locales.find((item) => String(item.id) === event.target.value)
          const point = locale ? localeRepresentativePoint(locale) : null
          if (point) onPositionChange({ lat: point[1].toFixed(6), lon: point[0].toFixed(6) })
        }}
        className="min-h-10 rounded border border-field-border bg-surface px-3 py-2.5 font-normal text-text focus:border-accent focus:outline-none"
      >
        <option value="">{hasPosition ? "Ingen matchande plats" : "Välj plats…"}</option>
        {locales.map((locale) => <option key={locale.id} value={locale.id}>{locale.name}</option>)}
      </select>
      {outside ? (
        <span className="text-xs font-normal text-text-faint">
          Positionen ligger utanför platsen, men observationen räknas till den.
        </span>
      ) : null}
    </label>
  )
}
