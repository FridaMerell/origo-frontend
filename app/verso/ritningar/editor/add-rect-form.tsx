"use client"

import { useState } from "react"
import { Button } from "@/app/components/ui/Button"
import { Field, fieldInputClass } from "@/app/components/form/Field"
import type { DrawingRole, DrawingUnit } from "@/app/lib/dal"

const parse = (text: string) => Number(text.replace(",", "."))

/** Adds a rectangle from typed measurements, e.g. a wall or a window, without drawing it first. */
export function AddRectForm({
  unit,
  defaultRole,
  onAdd,
  onCancel,
}: {
  unit: DrawingUnit
  defaultRole: DrawingRole | undefined
  onAdd: (width: number, height: number, role: DrawingRole | undefined) => void
  onCancel: () => void
}) {
  const [width, setWidth] = useState("")
  const [height, setHeight] = useState("")
  const [role, setRole] = useState<DrawingRole | "">(defaultRole ?? "")
  const valid = parse(width) > 0 && parse(height) > 0

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onAdd(parse(width), parse(height), role || undefined)
      }}
    >
      <Field label={`Bredd (${unit})`}>
        <input autoFocus type="text" inputMode="decimal" className={fieldInputClass} value={width} onChange={(e) => setWidth(e.target.value)} />
      </Field>
      <Field label={`Höjd (${unit})`}>
        <input type="text" inputMode="decimal" className={fieldInputClass} value={height} onChange={(e) => setHeight(e.target.value)} />
      </Field>
      <Field label="Typ av yta">
        <select className={fieldInputClass} value={role} onChange={(e) => setRole(e.target.value as DrawingRole | "")}>
          <option value="">Ingen (enbart ritning)</option>
          <option value="surface">Yta att täcka (t.ex. fasad)</option>
          <option value="opening">Öppning (fönster, dörr)</option>
        </select>
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Avbryt
        </Button>
        <Button type="submit" size="sm" disabled={!valid}>
          Lägg till
        </Button>
      </div>
    </form>
  )
}
