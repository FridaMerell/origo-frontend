"use client"

import { useMemo, useState } from "react"
import { PencilIcon, PlusIcon } from "lucide-react"
import { Button } from "@/app/components/ui/Button"
import { DeleteButton } from "@/app/components/ui/DeleteButton"
import { deleteScreen } from "@/app/actions/flux/design"
import type { FluxScreen } from "@/app/lib/dal"
import { useModel } from "./model-context"
import { ScreenFormDrawer } from "./screen-form-drawer"
import { toScreenTree } from "./screen-tree"

export function ScreensView({ initialScreens }: { initialScreens: FluxScreen[] }) {
  const { projectId, entities } = useModel()
  const [screens, setScreens] = useState(initialScreens)
  const [drawer, setDrawer] = useState<{ open: boolean; screen?: FluxScreen }>({ open: false })

  const tree = useMemo(() => toScreenTree(screens), [screens])
  const entityName = (id: number) => entities.find((entity) => entity.id === id)?.name ?? "?"

  const removeScreen = async (screen: FluxScreen) => {
    // Children lose their parent server-side (SET_NULL), so mirror that locally.
    setScreens((prev) => prev.filter((item) => item.id !== screen.id).map((item) => (item.parent === screen.id ? { ...item, parent: null } : item)))
    const result = await deleteScreen(screen.id)
    if (result?.error) setScreens(screens)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-text-muted">Skärmar och routes i applikationen, med vilka entiteter de visar.</p>
        <Button variant="secondary" size="sm" onClick={() => setDrawer({ open: true })}>
          <PlusIcon size={14} />
          Ny skärm
        </Button>
      </div>

      {tree.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-text-muted">
          Inga skärmar än.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {tree.map(({ screen, depth }) => (
            <li key={screen.id} className="flex items-center justify-between gap-3 py-2.5 pr-4" style={{ paddingLeft: `${1 + depth * 1.5}rem` }}>
              <div className="min-w-0 text-sm">
                <span className="font-medium text-text">{screen.name}</span>
                <span className="ml-2 font-mono text-xs text-text-muted">{screen.route}</span>
                {screen.entities.length > 0 && (
                  <p className="mt-1 text-xs text-text-faint">{screen.entities.map(entityName).join(", ")}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label="Redigera skärm"
                  className="rounded-md p-1 text-text-faint transition-colors hover:bg-surface-2 hover:text-text"
                  onClick={() => setDrawer({ open: true, screen })}
                >
                  <PencilIcon size={14} />
                </button>
                <DeleteButton
                  label="Ta bort skärm"
                  confirmTitle="Ta bort skärm"
                  confirmMessage="Ta bort skärmen? Underordnade skärmar behålls."
                  showTitle
                  className="rounded-md p-1 text-text-faint transition-colors hover:bg-danger-wash hover:text-danger disabled:opacity-50"
                  onDelete={() => removeScreen(screen)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <ScreenFormDrawer
        open={drawer.open}
        onClose={() => setDrawer({ open: false })}
        projectId={projectId}
        screen={drawer.screen}
        screens={screens}
        entities={entities}
        onSaved={(saved) =>
          setScreens((prev) => (prev.some((item) => item.id === saved.id) ? prev.map((item) => (item.id === saved.id ? saved : item)) : [...prev, saved]))
        }
      />
    </div>
  )
}
