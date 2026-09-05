"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/app/components/ui/Button"
import { CurrentLocationButton } from "@/app/components/ui/CurrentLocationButton"
import { useConfirmDialog } from "@/app/components/ui/useConfirmDialog"
import { deleteObservation, updateObservation } from "@/app/tempus/_actions/observations"
import { parseLatLon } from "@/app/tempus/formatters"
import type { TempusObservation } from "@/app/lib/dal"

function toLocalInput(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

export default function ObservationEditor({ observation }: { observation: TempusObservation }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const { requestConfirm, dialog } = useConfirmDialog()

  const initialPoint =
    observation.location && "coordinates" in observation.location
      ? observation.location.coordinates
      : null

  const [observedAt, setObservedAt] = useState(toLocalInput(observation.observed_at))
  const [lat, setLat] = useState(initialPoint ? String(initialPoint[1]) : "")
  const [lon, setLon] = useState(initialPoint ? String(initialPoint[0]) : "")
  const [count, setCount] = useState(observation.count ? String(observation.count) : "")
  const [notes, setNotes] = useState(observation.notes ?? "")

  const save = () => {
    setError(null)
    if (count.trim() && !/^\d+$/.test(count.trim())) {
      setError("Antal måste vara ett heltal.")
      return
    }
    if (!observedAt) {
      setError("Ange en tidpunkt.")
      return
    }
    const parsedCoords = parseLatLon(lat, lon)
    if ("error" in parsedCoords) {
      setError(parsedCoords.error)
      return
    }
    const { lat: latNum, lon: lonNum } = parsedCoords
    startTransition(async () => {
      const result = await updateObservation(observation.id, {
        observed_at: new Date(observedAt).toISOString(),
        ...(latNum !== null && lonNum !== null
          ? { location: { type: "Point" as const, coordinates: [lonNum, latNum] as [number, number] } }
          : {}),
        count: count.trim() ? Number(count.trim()) : null,
        notes: notes.trim(),
      })
      if (result.error) {
        setError(result.error)
        return
      }
      setEditing(false)
      router.refresh()
    })
  }

  const remove = () => {
    requestConfirm({
      title: "Ta bort observation",
      message: "Ta bort den här observationen? Det går inte att ångra.",
      confirmLabel: "Ta bort",
      destructive: true,
      onConfirm: () => {
        setError(null)
        startTransition(async () => {
          const result = await deleteObservation(observation.id)
          if (result.error) {
            setError(result.error)
            return
          }
          router.push("/observationer")
        })
      },
    })
  }

  if (!editing) {
    return (
      <div className="flex flex-col gap-3">
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <div className="flex gap-3">
          <Button type="button" variant="paper" className="underline underline-offset-4" onClick={() => setEditing(true)}>
            Redigera
          </Button>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="font-display text-sm italic text-text-muted underline underline-offset-4 hover:text-danger disabled:opacity-50"
          >
            Ta bort
          </button>
        </div>
        {dialog}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
      <header className="flex items-center justify-between border-b border-border px-4 py-2 sm:px-5">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[.14em] text-text-faint">Ändringsblad</p>
          <h2 className="font-display text-sm font-medium italic">Redigera observationsuppgifter</h2>
        </div>
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={pending}
          className="text-xs text-text-muted hover:text-text disabled:opacity-50"
          aria-label="Stäng redigeringen"
        >
          Stäng
        </button>
      </header>

      <div className="grid border-l border-border sm:grid-cols-[1.25fr_.65fr]">
        <label className="flex flex-col border-b border-r border-border px-3 py-2 font-display text-[9px] italic text-text-faint sm:px-4">
          Tidpunkt
          <input
            type="datetime-local"
            value={observedAt}
            onChange={(event) => setObservedAt(event.target.value)}
            className="mt-0.5 h-8 rounded-none border border-field-border bg-surface-raised px-2.5 font-body text-xs not-italic text-text focus:border-accent focus:outline-none"
          />
        </label>

        <label className="flex flex-col border-b border-r border-border px-3 py-2 font-display text-[9px] italic text-text-faint sm:px-4">
          Antal
          <input
            inputMode="numeric"
            value={count}
            onChange={(event) => setCount(event.target.value)}
            placeholder="Antal"
            className="mt-0.5 h-8 rounded-none border border-field-border bg-surface-raised px-2.5 font-body text-xs not-italic text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
          />
        </label>

        <div className="border-b border-r border-border px-3 py-2 sm:col-span-2 sm:px-4">
          <p className="font-display text-[9px] italic text-text-faint">
            Position <span>(valfritt)</span>
          </p>
          <div className="mt-0.5 flex flex-wrap items-start gap-3">
            <label className="min-w-0 flex-1 basis-32">
              <span className="sr-only">Latitud</span>
              <input
                inputMode="decimal"
                value={lat}
                onChange={(event) => setLat(event.target.value)}
                placeholder="Latitud"
                className="h-8 w-full rounded-none border border-field-border bg-surface-raised px-2.5 text-xs text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
              />
            </label>
            <label className="min-w-0 flex-1 basis-32">
              <span className="sr-only">Longitud</span>
              <input
                inputMode="decimal"
                value={lon}
                onChange={(event) => setLon(event.target.value)}
                placeholder="Longitud"
                className="h-8 w-full rounded-none border border-field-border bg-surface-raised px-2.5 text-xs text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
              />
            </label>
            <CurrentLocationButton
              size="sm"
              className="h-8 rounded-none text-xs"
              onLocate={({ latitude, longitude }) => {
                setLat(latitude.toFixed(6))
                setLon(longitude.toFixed(6))
                setError(null)
              }}
            />
          </div>
        </div>

        <label className="flex flex-col border-b border-r border-border px-3 py-2 font-display text-[9px] italic text-text-faint sm:col-span-2 sm:px-4">
          Särskild anteckning
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            className="mt-0.5 min-h-14 resize-y rounded-none border border-field-border bg-surface-raised px-2.5 py-1.5 font-body text-xs not-italic leading-5 text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
          />
        </label>
      </div>

      {error ? <p className="border-b border-border bg-danger-wash px-4 py-2 text-xs text-danger">{error}</p> : null}

      <div className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
        <Button type="button" variant="paper" size="sm" className="rounded-none" onClick={save} disabled={pending}>
          {pending ? "Sparar…" : "Spara ändringar"}
        </Button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={pending}
          className="text-xs text-text-muted hover:text-text disabled:opacity-50"
        >
          Avbryt
        </button>
      </div>
    </div>
  )
}
