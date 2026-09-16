"use client"

import { useTempusLocales } from "@/app/tempus/_state/tempus-context"
import { localeRepresentativePoint, localesAtPoint } from "@/app/tempus/locales"

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

export function LocaleField({
  lat,
  lon,
  onChange,
}: {
  lat: string
  lon: string
  onChange: (coords: { lat: string; lon: string }) => void
}) {
  const locales = useTempusLocales()
  const hasPosition = Boolean(lat.trim() && lon.trim())
  const matches = hasPosition ? localesAtPoint(locales, Number(lon), Number(lat)) : []
  const selectedLocaleId = matches[0]?.id ?? ""

  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      Lokal
      <select
        value={selectedLocaleId}
        onChange={(event) => {
          const locale = locales.find((item) => String(item.id) === event.target.value)
          if (!locale) return
          const point = localeRepresentativePoint(locale)
          if (!point) return
          onChange({ lat: point[1].toFixed(6), lon: point[0].toFixed(6) })
        }}
        className="min-h-10 rounded border border-field-border bg-surface px-3 py-2.5 font-normal text-text focus:border-accent focus:outline-none"
      >
        <option value="">{hasPosition ? "Ingen matchande lokal" : "Välj lokal…"}</option>
        {locales.map((locale) => <option key={locale.id} value={locale.id}>{locale.name}</option>)}
      </select>
      <span className="text-xs font-normal text-text-faint">
        Vald lokal sätter observationens position till en punkt inom området.
      </span>
    </label>
  )
}
