"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/app/components/ui/Button"
import { createLocale, updateLocale, type CreateLocaleInput } from "@/app/tempus/_actions/locales"
import type { TempusLocale } from "@/app/lib/dal/tempus/geo"
import { TitleField } from "@/app/tempus/forms/Fields"
import type { GeoJsonPolygonGeometry } from "@/app/tempus/ui/biotope-map/SwedenMap"
import { LocaleMapEditor } from "./locale-map-editor"

export default function LocaleForm({ initial }: { initial?: TempusLocale | null }) {
  const router = useRouter()
  const initialGeometry: GeoJsonPolygonGeometry | null = initial?.geometry?.coordinates[0]
    ? { type: "Polygon", coordinates: initial.geometry.coordinates[0] }
    : null
  // The map editor only ever draws a single ring, but a locale's own
  // MultiPolygon can (in principle) carry more than one — e.g. one saved
  // outside this editor. Editing used to silently drop every polygon past
  // the first one the moment the form was submitted, since only the edited
  // ring was ever sent back. Keeping the untouched extras here and splicing
  // them back in on submit means editing a locale can no longer destroy data
  // it never even showed.
  const extraPolygons = initial?.geometry?.coordinates.slice(1) ?? []
  const [name, setName] = useState(initial?.name ?? "")
  const [geometry, setGeometry] = useState<GeoJsonPolygonGeometry | null>(initialGeometry)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setPending(true)
    const payload: CreateLocaleInput = {
      name,
      geometry: geometry ? { type: "MultiPolygon", coordinates: [geometry.coordinates, ...extraPolygons] } : null,
    }
    const result = initial
      ? await updateLocale(initial.id, payload)
      : await createLocale(payload)
    setPending(false)
    if (result.error) {
      setError(result.error)
      return
    }
    router.push("/lokaler")
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <label className="flex flex-col items-center gap-1 border-b border-border-strong pb-4 text-center">
        <span className="sr-only">Platsens namn</span>
        <TitleField
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Platsens namn"
        />
      </label>
      <p className="font-display text-sm italic leading-6 text-text-muted">
        Sök upp adressen och rita gränsen för platsen. Observationer som registreras innanför gränsen kopplas automatiskt till den.
      </p>
      <LocaleMapEditor initialValue={initialGeometry} disabled={pending} onChange={setGeometry} height={480} />
      {extraPolygons.length > 0 ? (
        <p className="rounded bg-surface-2/40 px-3 py-2 text-xs italic text-text-muted">
          Platsen har fler ytor än den här kartan kan visa — endast den första ytan går att redigera här, resten sparas oförändrade.
        </p>
      ) : null}
      {error ? <p className="rounded bg-danger-wash px-3 py-2 text-sm text-danger" role="alert">{error}</p> : null}
      <Button type="submit" variant="paper-bordered" className="w-fit" disabled={pending || !name.trim() || !geometry}>
        {pending ? "Sparar…" : initial ? "Spara ändringar" : "Skapa plats"}
      </Button>
    </form>
  )
}
