"use client"

import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/app/components/ui/Button"
import { CurrentLocationButton } from "@/app/components/ui/CurrentLocationButton"
import { Icon } from "@/app/components/ui/Icon"
import { createObservation } from "@/app/actions/tempus"
import { speciesName, useTempusSpecies } from "@/app/lib/tempus-context"

function nowLocal() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

export default function QuickObservation() {
  const species = useTempusSpecies()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [open, setOpen] = useState(false)
  const [entered, setEntered] = useState(false)

  const [query, setQuery] = useState("")
  const [picked, setPicked] = useState<{ id: string; label: string; scientific: string } | null>(null)
  const [count, setCount] = useState("1")
  const [observedAt, setObservedAt] = useState(nowLocal())
  const [lat, setLat] = useState("")
  const [lon, setLon] = useState("")
  const [showDetails, setShowDetails] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  const searchRef = useRef<HTMLInputElement>(null)
  const deferredQuery = useDeferredValue(query)

  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => setEntered(true))
    const focus = setTimeout(() => searchRef.current?.focus(), 120)
    return () => {
      cancelAnimationFrame(id)
      clearTimeout(focus)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setEntered(false)
        setOpen(false)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  const matches = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    if (!q || picked) return []
    return species
      .filter(
        (item) =>
          item.swedish_name.toLowerCase().includes(q) ||
          item.scientific_name.toLowerCase().includes(q) ||
          String(item.dyntaxa_taxon_id).includes(q),
      )
      .slice(0, 8)
  }, [deferredQuery, species, picked])

  const reset = () => {
    setQuery("")
    setPicked(null)
    setCount("1")
    setError(null)
  }

  const close = () => {
    setEntered(false)
    setOpen(false)
    setSaved(null)
    reset()
    setShowDetails(false)
  }

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSaved(null)

    if (!picked) {
      setError("Välj en art.")
      return
    }
    const trimmed = count.trim()
    if (trimmed && !/^\d+$/.test(trimmed)) {
      setError("Antal måste vara ett heltal.")
      return
    }
    if (!observedAt) {
      setError("Ange en tidpunkt.")
      return
    }

    const parseCoord = (value: string) => {
      const trimmed = value.trim()
      if (!trimmed) return null
      return Number(trimmed.replace(",", "."))
    }
    const latNum = parseCoord(lat)
    const lonNum = parseCoord(lon)
    if ((latNum === null) !== (lonNum === null)) {
      setError("Ange både latitud och longitud, eller ingen.")
      return
    }
    if (
      (latNum !== null && (!Number.isFinite(latNum) || Math.abs(latNum) > 90)) ||
      (lonNum !== null && (!Number.isFinite(lonNum) || Math.abs(lonNum) > 180))
    ) {
      setError("Ogiltig koordinat.")
      return
    }
    const location =
      latNum !== null && lonNum !== null
        ? { type: "Point" as const, coordinates: [lonNum, latNum] as [number, number] }
        : undefined

    const label = picked.label

    startTransition(async () => {
      const result = await createObservation({
        species: picked.id,
        checklist_items: [],
        observed_at: new Date(observedAt).toISOString(),
        ...(location ? { location } : {}),
        count: trimmed ? Number(trimmed) : null,
        notes: "",
      })

      if (result.error) {
        setError(result.error)
        return
      }

      router.refresh()
      setSaved(`${label} sparad.`)
      setObservedAt(nowLocal())
      reset()
      setTimeout(() => searchRef.current?.focus(), 0)
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setEntered(false)
          setOpen(true)
        }}
        aria-label="Ny observation"
        title="Ny observation"
        className="flex size-10 items-center justify-center rounded bg-accent text-accent-contrast hover:bg-accent-hover"
      >
        <Icon name="plus" size={18} />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 transition-opacity sm:items-center"
          style={{
            transitionDuration: "var(--duration-normal)",
            transitionTimingFunction: "var(--ease-standard)",
            opacity: entered ? 1 : 0,
          }}
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Snabbregistrera observation"
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-lg transition-transform sm:max-w-md sm:rounded-2xl"
            style={{
              transitionDuration: "var(--duration-normal)",
              transitionTimingFunction: "var(--ease-standard)",
              transform: entered ? "translateY(0)" : "translateY(2rem)",
            }}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="m-0 flex items-center gap-2 font-display text-lg font-semibold text-text">
                <Icon name="binoculars" size={16} className="text-accent" />
                Ny observation
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Stäng"
                className="text-text-muted hover:text-text"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <form className="flex flex-col gap-4 overflow-y-auto p-4" onSubmit={submit}>
              <div className="relative flex flex-col gap-1.5 text-sm font-medium">
                Art
                {picked ? (
                  <div className="flex items-center justify-between gap-3 rounded border border-field-border bg-surface-2 px-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{picked.label}</span>
                      <span className="block truncate font-mono text-[11px] text-text-muted">
                        {picked.scientific}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={reset}
                      aria-label="Byt art"
                      className="shrink-0 text-text-faint hover:text-text"
                    >
                      <Icon name="x" size={15} />
                    </button>
                  </div>
                ) : (
                  <span className="relative">
                    <Icon
                      name="search"
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint"
                    />
                    <input
                      ref={searchRef}
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Sök art"
                      autoComplete="off"
                      className="w-full rounded border border-field-border bg-surface py-2.5 pl-9 pr-3 font-normal text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
                    />
                  </span>
                )}
                {matches.length > 0 ? (
                  <ul className="absolute inset-x-0 top-full z-10 mt-1 max-h-64 overflow-y-auto rounded border border-border bg-surface shadow-md">
                    {matches.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setPicked({
                              id: item.id,
                              label: speciesName(item),
                              scientific: item.scientific_name,
                            })
                            setQuery("")
                            setError(null)
                          }}
                          className="block w-full border-b border-border px-3 py-2 text-left text-sm font-normal last:border-b-0 hover:bg-accent-wash hover:text-accent"
                        >
                          <span className="font-medium">{speciesName(item)}</span>
                          <span className="ml-2 font-mono text-[11px] text-text-muted">
                            {item.scientific_name}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Antal
                <input
                  inputMode="numeric"
                  value={count}
                  onChange={(event) => setCount(event.target.value)}
                  placeholder="Antal"
                  className="rounded border border-field-border bg-surface px-3 py-2.5 font-normal text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
                />
              </label>

              {showDetails ? (
                <>
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    Tidpunkt
                    <input
                      type="datetime-local"
                      value={observedAt}
                      max={nowLocal()}
                      onChange={(event) => setObservedAt(event.target.value)}
                      className="rounded border border-field-border bg-surface px-3 py-2.5 font-normal text-text focus:border-accent focus:outline-none"
                    />
                  </label>

                  <fieldset className="flex flex-col gap-2">
                    <legend className="mb-1 text-sm font-medium">
                      Position <span className="font-normal text-text-faint">(valfritt)</span>
                    </legend>
                    <div className="flex flex-wrap items-start gap-2">
                      <input
                        inputMode="decimal"
                        value={lat}
                        onChange={(event) => setLat(event.target.value)}
                        placeholder="Latitud"
                        className="h-10 min-w-0 flex-1 basis-28 rounded border border-field-border bg-surface px-3 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
                      />
                      <input
                        inputMode="decimal"
                        value={lon}
                        onChange={(event) => setLon(event.target.value)}
                        placeholder="Longitud"
                        className="h-10 min-w-0 flex-1 basis-28 rounded border border-field-border bg-surface px-3 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
                      />
                      <CurrentLocationButton
                        size="sm"
                        className="h-10"
                        onLocate={({ latitude, longitude }) => {
                          setLat(latitude.toFixed(6))
                          setLon(longitude.toFixed(6))
                          setError(null)
                        }}
                      />
                    </div>
                  </fieldset>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDetails(true)}
                  className="self-start text-sm text-text-muted hover:text-text"
                >
                  + Tidpunkt och position
                </button>
              )}

              {error ? (
                <p className="rounded bg-danger-wash px-3 py-2 text-sm text-danger" role="alert">
                  {error}
                </p>
              ) : null}
              {saved ? (
                <p className="flex items-center gap-2 rounded bg-accent-wash px-3 py-2 text-sm text-accent" role="status">
                  <Icon name="check" size={15} />
                  {saved} Lägg till nästa.
                </p>
              ) : null}

              <div className="flex items-center gap-3 pt-1">
                <Button type="submit" disabled={pending || !picked} className="flex-1 justify-center">
                  <Icon
                    name={pending ? "loader" : "check"}
                    size={16}
                    className={pending ? "animate-spin" : ""}
                  />
                  {pending ? "Sparar…" : "Spara"}
                </Button>
                <button
                  type="button"
                  onClick={close}
                  className="text-sm text-text-muted hover:text-text"
                >
                  Klar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}
