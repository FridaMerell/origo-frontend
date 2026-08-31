"use client"

import { useDeferredValue, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/app/components/ui/Button"
import { speciesName } from "@/app/lib/tempus-context"
import { createSpeciesCategory } from "@/app/actions/tempus"
import { useSpeciesPage } from "@/app/tempus/ui/use-species-page"

export default function SpeciesCategoryForm() {
  const router = useRouter()
  const [label, setLabel] = useState("")
  const [taxa, setTaxa] = useState<number | null>(0)
  const [imageUrl, setImageUrl] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const deferredFilter = useDeferredValue(filter)

  const {
    results: visible,
    page,
    setPage,
    totalPages,
    loading,
    error: loadError,
  } = useSpeciesPage({ search: deferredFilter })

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    if (!taxa) return false
    const result = await createSpeciesCategory({
      label,
      image_url: imageUrl,
      taxon_id: taxa,
      species: [...selected],
    })
    setSubmitting(false)
    if (result?.error) {
      setError(result.error)
      return
    }
    setLabel("")
    setImageUrl("")
    setSelected(new Set())
    router.refresh()
  }

  return (
    <form className="flex max-w-[520px] flex-col gap-4" onSubmit={onSubmit}>
      <label className="flex flex-col gap-1 text-sm">
        Etikett
        <input
          type="text"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="T.ex. Vårflyttare"
          className="rounded border border-field-border bg-surface px-3 py-2 text-text"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Taxa
        <input
          type="number"
          value={taxa ?? ""}
          onChange={(event) => setTaxa(event.target.value ? parseInt(event.target.value) : null)}
          placeholder="T.ex. 5"
          className="rounded border border-field-border bg-surface px-3 py-2 text-text"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Bild-URL (valfritt)
        <input
          type="url"
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
          placeholder="https://…"
          className="rounded border border-field-border bg-surface px-3 py-2 text-text"
        />
      </label>

      <div className="flex flex-col gap-1 text-sm">
        Arter
        <input
          type="text"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Sök art…"
          className="rounded border border-field-border bg-surface px-3 py-2 text-text"
        />
        <div className="mt-1 max-h-64 overflow-y-auto rounded border border-border">
          {loading ? (
            <p className="px-3 py-2 text-sm text-text-muted">Hämtar arter…</p>
          ) : visible.length === 0 ? (
            <p className="px-3 py-2 text-sm text-text-muted">Inga arter matchar.</p>
          ) : (
            visible.map((s) => (
              <label
                key={s.id}
                className="flex items-center gap-2 border-b border-border px-3 py-2 text-sm last:border-b-0"
              >
                <input
                  type="checkbox"
                  checked={selected.has(s.id)}
                  onChange={() => toggle(s.id)}
                />
                {speciesName(s)}
              </label>
            ))
          )}
        </div>
        {loadError && <p className="text-xs text-danger">{loadError}</p>}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-text-muted">
            <button type="button" disabled={page === 1 || loading} onClick={() => setPage(page - 1)} className="text-accent disabled:text-text-faint">Föregående</button>
            <span>Sida {page} av {totalPages}</span>
            <button type="button" disabled={page === totalPages || loading} onClick={() => setPage(page + 1)} className="text-accent disabled:text-text-faint">Nästa</button>
          </div>
        )}
        <span className="text-xs text-text-faint">{selected.size} valda</span>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button
        variant="paper-bordered"
        type="submit"
        className="w-max"
        disabled={submitting || !label.trim() || !taxa}
      >
        {submitting ? "Sparar…" : "Skapa kategori"}
      </Button>
    </form>
  )
}
