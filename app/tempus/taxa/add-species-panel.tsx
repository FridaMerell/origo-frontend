"use client"

import { useEffect, useState } from "react"
import { Button } from "@/app/components/ui/Button"
import { registerSpeciesBatch, searchTaxa } from "@/app/tempus/_actions/species"
import type { TempusTaxonHit } from "@/app/lib/dal"

type Props = {
  categoryId: string
  categoryLabel: string
  underTaxonId: number | null
  query: string
  existingDyntaxaIds: number[]
}

type RowState = { status: "pending" | "queued" } | { status: "error"; error: string }

/** Artfakta hits for the page's search that are not in the category yet. */
export default function AddSpeciesPanel({
  categoryId,
  categoryLabel,
  underTaxonId,
  query,
  existingDyntaxaIds,
}: Props) {
  // The latest answer and the query it answers; it is searching until the
  // answer matches the current query.
  const [result, setResult] = useState<{ query: string; hits: TempusTaxonHit[]; error?: string }>({ query: "", hits: [] })
  const [rows, setRows] = useState<Record<number, RowState>>({})

  useEffect(() => {
    let cancelled = false
    searchTaxa(query, underTaxonId).then((found) => {
      if (!cancelled) setResult({ query, hits: found.hits, error: found.error })
    })
    return () => {
      cancelled = true
    }
  }, [query, underTaxonId])

  const searching = result.query !== query
  const hits = searching
    ? []
    : result.hits.filter((hit) => !existingDyntaxaIds.includes(hit.taxon_id))

  const add = async (taxonId: number) => {
    setRows((prev) => ({ ...prev, [taxonId]: { status: "pending" } }))
    const outcome = await registerSpeciesBatch(categoryId, [taxonId])
    setRows((prev) => ({
      ...prev,
      [taxonId]: outcome.error ? { status: "error", error: outcome.error } : { status: "queued" },
    }))
  }

  if (!searching && !result.error && hits.length === 0) return null

  return (
    <section className="flex flex-col gap-1">
      <h2 className="font-display text-xl font-semibold">Inte i {categoryLabel} än</h2>
      <p className="text-sm text-text-muted">
        Från Artfakta. Tillagda arter hämtas i bakgrunden och får fenogram när importen är klar.
      </p>

      {searching ? (
        <p className="py-2 text-xs text-text-muted">Hämtar arter…</p>
      ) : result.error ? (
        <p className="rounded bg-danger-wash px-3 py-2 text-sm text-danger" role="alert">{result.error}</p>
      ) : (
        <dl>
          {hits.map((hit) => {
            const row = rows[hit.taxon_id]
            return (
              <div key={hit.taxon_id} className="border-b border-field-border py-2">
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <div className="grid min-w-0 grid-cols-[max-content_minmax(0,1fr)] items-baseline gap-4">
                    <span className="font-display text-md capitalize">
                      {hit.swedish_name || hit.scientific_name}
                    </span>
                    <span className="min-w-0 truncate font-mono text-sm italic text-text-muted">
                      {hit.swedish_name ? hit.scientific_name : ""}
                    </span>
                  </div>
                  {row?.status === "queued" ? (
                    <span className="text-sm text-text-muted" role="status">I importkön</span>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => add(hit.taxon_id)}
                      disabled={row?.status === "pending"}
                      className="h-10 min-h-0 rounded-md border border-accent bg-surface px-3 !text-accent hover:bg-accent-wash"
                    >
                      {row?.status === "pending" ? "Lägger till…" : "Lägg till"}
                    </Button>
                  )}
                </div>
                {row?.status === "error" && (
                  <p className="mt-2 rounded bg-danger-wash px-3 py-2 text-sm text-danger" role="alert">{row.error}</p>
                )}
              </div>
            )
          })}
        </dl>
      )}
    </section>
  )
}
