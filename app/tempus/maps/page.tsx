"use client"

import { useState, type FormEvent } from "react"
import { createGeoArea, type GeoAreaKind } from "@/app/actions/tempus"
import { Button } from "@/app/components/ui/Button"
import { Card } from "@/app/components/ui/Card"
import type { GeoJsonPolygonGeometry } from "@/app/tempus/ui/biotope-map/SwedenMap"
import { SwedenMapAreaEditor } from "../ui/biotope-map/SwedenMapAreaEditor"

const GEO_AREA_KINDS: Array<{ value: GeoAreaKind; label: string }> = [
  { value: "country", label: "Land" },
  { value: "county", label: "Län" },
  { value: "province", label: "Landskap" },
  { value: "nature_reserve", label: "Naturreservat" },
  { value: "biological_area", label: "Biologiskt område" },
]

export default function MapsPage() {
  const [name, setName] = useState("")
  const [kind, setKind] = useState<GeoAreaKind>("biological_area")
  const [geometry, setGeometry] = useState<GeoJsonPolygonGeometry | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setSubmitting(true)

    const result = await createGeoArea({ name, kind, geometry })
    setSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setSuccess("Området har sparats.")
  }

  return (
    <main className="container px-4 py-8 sm:px-8">
      <h1 className="font-display text-2xl">
        Skapa geografiskt område
      </h1>

      <Card className="mt-4 max-w-5xl">
        <form className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]" onSubmit={onSubmit}>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              Namn
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="T.ex. Mälardalen"
                className="rounded border border-field-border bg-surface px-3 py-2 text-text"
                required
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Typ
              <select
                value={kind}
                onChange={(event) => setKind(event.target.value as GeoAreaKind)}
                className="rounded border border-field-border bg-surface px-3 py-2 text-text"
              >
                {GEO_AREA_KINDS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <p className="text-xs text-text-muted">
              Landkod sätts automatiskt till SE. Klicka ut minst tre punkter på kartan.
            </p>

            {error ? <p className="text-sm text-danger">{error}</p> : null}
            {success ? <p className="text-sm text-success">{success}</p> : null}

            <Button
              type="submit"
              variant="paper"
              className="w-fit"
              disabled={submitting || !name.trim() || !geometry}
            >
              {submitting ? "Sparar…" : "Spara område"}
            </Button>
          </div>

          <SwedenMapAreaEditor
            width={420}
            height={630}
            padding={24}
            className="w-full max-w-[420px]"
            disabled={submitting}
            onChange={setGeometry}
          />
        </form>
      </Card>
    </main>
  )
}
