"use client"

import { useState } from "react"
import { Button } from "@/app/components/ui/Button"
import { Field, fieldInputClass } from "@/app/components/form/Field"
import type { DrawingUnit } from "@/app/lib/dal"

const parse = (text: string) => Number(text.replace(",", "."))

/** Sets the size of the drawing area itself, in the drawing's unit (anything from a window to a whole house). */
export function PageSizeForm({
  unit,
  width,
  height,
  onApply,
  onCancel,
}: {
  unit: DrawingUnit
  width: number
  height: number
  onApply: (width: number, height: number) => void
  onCancel: () => void
}) {
  const [w, setW] = useState(String(Number(width.toFixed(3))))
  const [h, setH] = useState(String(Number(height.toFixed(3))))
  const valid = parse(w) > 0 && parse(h) > 0

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onApply(parse(w), parse(h))
      }}
    >
      <Field label={`Ritytans bredd (${unit})`}>
        <input autoFocus type="text" inputMode="decimal" className={fieldInputClass} value={w} onChange={(e) => setW(e.target.value)} />
      </Field>
      <Field label={`Ritytans höjd (${unit})`}>
        <input type="text" inputMode="decimal" className={fieldInputClass} value={h} onChange={(e) => setH(e.target.value)} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Avbryt
        </Button>
        <Button type="submit" size="sm" disabled={!valid}>
          Använd
        </Button>
      </div>
    </form>
  )
}
