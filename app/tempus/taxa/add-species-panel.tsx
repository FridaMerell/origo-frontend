"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/app/components/ui/Button"
import { Icon } from "@/app/components/ui/Icon"
import { registerSpeciesBatch, searchTaxa } from "@/app/actions/tempus"
import type { TempusTaxonHit } from "@/app/lib/dal"

const taxonName = (hit: TempusTaxonHit) => hit.swedish_name || hit.scientific_name

type Props = {
  categoryId: string
  categoryLabel: string
  existingDyntaxaIds: number[]
  underTaxonId: number | null
}

function TaxonMeta({ hit }: { hit: TempusTaxonHit }) {
  return (
    <>
      <span className="font-medium">{taxonName(hit)}</span>
      {hit.swedish_name && hit.scientific_name && (
        <em className="ml-2 font-mono text-xs text-text-muted">{hit.scientific_name}</em>
      )}
      {hit.taxon_rank && (
        <span className="ml-2 font-mono text-[10px] uppercase tracking-wide text-text-faint">
          {hit.taxon_rank}
        </span>
      )}
    </>
  )
}

export default function AddSpeciesPanel({
  categoryId,
  categoryLabel,
  existingDyntaxaIds,
  underTaxonId,
}: Props) {
  const router = useRouter()
  const existing = useMemo(() => new Set(existingDyntaxaIds), [existingDyntaxaIds])

  const [query, setQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [hits, setHits] = useState<TempusTaxonHit[]>([])
  const [staged, setStaged] = useState<TempusTaxonHit[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [registering, startRegister] = useTransition()

  const requestId = useRef(0)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setHits([])
      setSearching(false)
      return
    }
    setSearching(true)
    const current = ++requestId.current
    const timer = setTimeout(async () => {
      const result = await searchTaxa(q, underTaxonId)
      if (current !== requestId.current) return
      setSearching(false)
      if (result.error) {
        setMessage(result.error)
        setHits([])
        return
      }
      setMessage(null)
      setHits(result.hits)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, underTaxonId])

  const visibleHits = hits.filter(
    (hit) =>
      !existing.has(hit.taxon_id) &&
      !staged.some((s) => s.taxon_id === hit.taxon_id),
  )

  const stage = (hit: TempusTaxonHit | undefined) => {
    if (!hit) return
    setMessage(null)
    if (existing.has(hit.taxon_id)) {
      setMessage(`${taxonName(hit)} finns redan i ${categoryLabel}.`)
      return
    }
    setStaged((prev) =>
      prev.some((s) => s.taxon_id === hit.taxon_id) ? prev : [...prev, hit],
    )
    setQuery("")
    setHits([])
  }

  const removeStaged = (id: number) =>
    setStaged((prev) => prev.filter((s) => s.taxon_id !== id))

  const register = () => {
    setErrors([])
    setMessage(null)
    startRegister(async () => {
      const result = await registerSpeciesBatch(
        categoryId,
        staged.map((s) => s.taxon_id),
      )
      if (result.error) {
        setErrors([result.error])
        return
      }
      const okIds = new Set(
        result.results.filter((r) => r.ok).map((r) => r.taxon_id),
      )
      const failed = result.results.filter((r) => !r.ok)
      setStaged((prev) => prev.filter((s) => !okIds.has(s.taxon_id)))
      if (failed.length > 0) {
        setErrors(
          failed.map((f) => {
            const hit = staged.find((s) => s.taxon_id === f.taxon_id)
            return `${hit ? taxonName(hit) : f.taxon_id}: ${f.error ?? "kunde inte registreras"}`
          }),
        )
      } else {
        setMessage(`${okIds.size} ${okIds.size === 1 ? "art" : "arter"} registrerade.`)
      }
      if (okIds.size > 0) router.refresh()
    })
  }

  const showEmpty = query.trim().length >= 2 && !searching && visibleHits.length === 0

  return (
    <div className="flex flex-col gap-3 rounded-card border border-dashed border-border p-4">
      <span className="font-mono text-[10px] uppercase tracking-[.14em] text-secondary">
        Hittar du inte arten?
      </span>

      {staged.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {staged.map((hit) => (
            <li
              key={hit.taxon_id}
              className="flex items-center justify-between gap-3 rounded border border-border bg-surface px-3 py-2 text-sm"
            >
              <span className="min-w-0 truncate">
                <TaxonMeta hit={hit} />
              </span>
              <button
                type="button"
                onClick={() => removeStaged(hit.taxon_id)}
                aria-label={`Ta bort ${taxonName(hit)}`}
                className="shrink-0 text-text-muted hover:text-text"
              >
                <Icon name="x" size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault()
          stage(visibleHits[0])
        }}
      >
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ange artnamn att hämta från artdatabasen"
          className="flex-1 rounded border border-field-border bg-surface px-3 py-2 text-text placeholder:text-text-faint"
        />
        <Button
          type="submit"
          className="shrink-0 whitespace-nowrap"
          disabled={searching || visibleHits.length === 0}
        >
          {searching ? "Söker…" : "Hämta art"}
        </Button>
      </form>

      {(searching || visibleHits.length > 0 || showEmpty) && (
        <ul className="flex flex-col overflow-hidden rounded border border-border">
          {searching && visibleHits.length === 0 ? (
            <li className="px-3 py-2 text-sm text-text-muted">Söker…</li>
          ) : showEmpty ? (
            <li className="px-3 py-2 text-sm text-text-muted">
              Inga träffar för &quot;{query.trim()}&quot;.
            </li>
          ) : (
            visibleHits.map((hit) => (
              <li key={hit.taxon_id}>
                <button
                  type="button"
                  onClick={() => stage(hit)}
                  className="block w-full border-b border-border px-3 py-2 text-left text-sm last:border-b-0 hover:bg-accent-wash hover:text-accent"
                >
                  <TaxonMeta hit={hit} />
                </button>
              </li>
            ))
          )}
        </ul>
      )}

      {message && <p className="text-sm text-text-muted">{message}</p>}
      {errors.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm text-danger">
          {errors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      )}

      {staged.length > 0 && (
        <div className="flex items-center gap-3">
          <Button type="button" onClick={register} disabled={registering}>
            {registering
              ? "Registrerar…"
              : `Registrera ${staged.length} ${staged.length === 1 ? "art" : "arter"}`}
          </Button>
          <button
            type="button"
            onClick={() => setStaged([])}
            disabled={registering}
            className="text-sm text-text-muted hover:text-text disabled:opacity-50"
          >
            Rensa
          </button>
        </div>
      )}
    </div>
  )
}
