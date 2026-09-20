"use client"

import { useMemo, useState } from "react"
import { PencilIcon, PlusIcon } from "lucide-react"
import { Button } from "@/app/components/ui/Button"
import { DeleteButton } from "@/app/components/ui/DeleteButton"
import { AppLink as Link } from "@/app/components/ui/AppLink"
import { deleteSeedRow } from "@/app/actions/flux/design"
import type { FluxEntity, FluxSeedRow } from "@/app/lib/dal"
import { useModel } from "./model-context"
import { SeedFormDrawer } from "./seed-form-drawer"

export function SeedView({ initialRows }: { initialRows: FluxSeedRow[] }) {
  const { entities, fields } = useModel()
  const [rows, setRows] = useState(initialRows)
  const [drawer, setDrawer] = useState<{ entity: FluxEntity; row?: FluxSeedRow } | null>(null)

  const removeRow = async (row: FluxSeedRow) => {
    setRows((prev) => prev.filter((item) => item.id !== row.id))
    const result = await deleteSeedRow(row.id)
    if (result?.error) setRows((prev) => [...prev, row])
  }

  // Memoized: the drawer resets its form whenever this array's identity changes.
  const drawerFields = useMemo(
    () => (drawer ? fields.filter((field) => field.entity === drawer.entity.id) : []),
    [drawer, fields],
  )

  if (entities.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-text-muted">
        <Link href="/model" className="underline">Skapa entiteter</Link> först. Seed-data är exempelrader per entitet.
      </p>
    )
  }

  const drawerRows = drawer ? rows.filter((row) => row.entity === drawer.entity.id) : []

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-text-muted">Exempeldata per entitet som kan bli fixtures.</p>
      {entities.map((entity) => {
        const entityRows = rows.filter((row) => row.entity === entity.id).sort((a, b) => a.order - b.order || a.id - b.id)
        return (
          <section key={entity.id} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-text-faint">{entity.name}</h3>
              <Button variant="secondary" size="sm" onClick={() => setDrawer({ entity })}>
                <PlusIcon size={14} />
                Ny rad
              </Button>
            </div>
            {entityRows.length === 0 ? (
              <p className="text-sm text-text-muted">Inga rader.</p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
                {entityRows.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <code className="min-w-0 truncate font-mono text-xs text-text-muted">{JSON.stringify(row.data)}</code>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        aria-label="Redigera rad"
                        className="rounded-md p-1 text-text-faint transition-colors hover:bg-surface-2 hover:text-text"
                        onClick={() => setDrawer({ entity, row })}
                      >
                        <PencilIcon size={14} />
                      </button>
                      <DeleteButton
                        label="Ta bort rad"
                        confirmTitle="Ta bort rad"
                        confirmMessage="Ta bort raden? Det går inte att återställa."
                        showTitle
                        className="rounded-md p-1 text-text-faint transition-colors hover:bg-danger-wash hover:text-danger disabled:opacity-50"
                        onDelete={() => removeRow(row)}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}

      {drawer && (
        <SeedFormDrawer
          open
          onClose={() => setDrawer(null)}
          entity={drawer.entity}
          fields={drawerFields}
          nextOrder={drawerRows.length ? Math.max(...drawerRows.map((row) => row.order)) + 1 : 0}
          row={drawer.row}
          onSaved={(saved) =>
            setRows((prev) => (prev.some((item) => item.id === saved.id) ? prev.map((item) => (item.id === saved.id ? saved : item)) : [...prev, saved]))
          }
        />
      )}
    </div>
  )
}
