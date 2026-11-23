"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { addDrawingPage } from "../_actions/drawing"
import { Button } from "@/app/components/ui/Button"
import { useConfirmDialog } from "@/app/components/ui/useConfirmDialog"
import type { Drawing, DrawingPage } from "@/app/lib/dal"
import { PageEditor } from "./page-editor"

export function DrawingEditor({ drawing, pages }: { drawing: Drawing; pages: DrawingPage[] }) {
  const [activeId, setActiveId] = useState(pages[0]?.id ?? null)
  const [dirty, setDirty] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const active = pages.find((p) => p.id === activeId) ?? pages[0] ?? null

  const { askToConfirm, dialog } = useConfirmDialog()
  const confirmLeave = async () =>
    !dirty ||
    askToConfirm({
      title: "Byta sida?",
      message: "Du har osparade ändringar på sidan.",
      confirmLabel: "Byt ändå",
    })

  const addPage = async () => {
    if (!(await confirmLeave())) return
    setAdding(true)
    setError(null)
    const order = pages.reduce((max, p) => Math.max(max, p.order), -1) + 1
    const result = await addDrawingPage(drawing.id, `Sida ${pages.length + 1}`, order, drawing.unit)
    setAdding(false)
    if (result?.error) setError(result.error)
  }

  if (!active) {
    return <p className="text-sm text-text-muted">Ritningen saknar sidor.</p>
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {dialog}
      <div className="flex flex-wrap items-center gap-1.5">
        {pages.map((p) => (
          <Button
            key={p.id}
            type="button"
            size="sm"
            variant={p.id === active.id ? "primary" : "secondary"}
            onClick={async () => {
              if (p.id !== active.id && (await confirmLeave())) setActiveId(p.id)
            }}
          >
            {p.name}
          </Button>
        ))}
        <Button type="button" size="sm" variant="ghost" disabled={adding} onClick={() => void addPage()}>
          <Plus size={14} />
          Ny sida
        </Button>
        {error && (
          <span role="alert" className="text-sm text-danger">
            {error}
          </span>
        )}
      </div>

      <PageEditor key={active.id} drawing={drawing} page={active} onDirtyChange={setDirty} />
    </div>
  )
}
