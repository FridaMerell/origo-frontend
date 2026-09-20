"use client"

import { useEffect, useState } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/app/components/ui/Button"
import { Field, fieldInputClass } from "@/app/components/form/Field"
import type { DrawingElement, DrawingRole, DrawingUnit } from "@/app/lib/dal"
import { dimensionGeometry, distance, edgeLength, formatLength, setEdgeLength, type Pt } from "./geometry"

/** Numeric input that keeps its own text while focused so partial input ("1.") is not rewritten. */
function NumberField({
  label,
  value,
  onValue,
  onDone,
  min,
}: {
  label: string
  value: number
  onValue: (value: number) => void
  onDone: () => void
  min?: number
}) {
  const [text, setText] = useState(String(Number(value.toFixed(3))))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setText(String(Number(value.toFixed(3))))
  }, [value, focused])

  return (
    <Field label={label}>
      <input
        type="text"
        inputMode="decimal"
        className={fieldInputClass}
        value={text}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false)
          onDone()
        }}
        onChange={(e) => {
          setText(e.target.value)
          const parsed = Number(e.target.value.replace(",", "."))
          if (Number.isFinite(parsed) && e.target.value.trim() !== "" && (min === undefined || parsed >= min)) {
            onValue(parsed)
          }
        }}
      />
    </Field>
  )
}

/**
 * Lets the user type measured wall lengths (each edge shifts the points after it) and
 * exact point coordinates. Old houses are rarely square, so nothing here rounds values.
 */
function PointsEditor({
  points,
  closed,
  unit,
  onChange,
  onDone,
}: {
  points: Pt[]
  closed?: boolean
  unit: DrawingUnit
  onChange: (points: Pt[]) => void
  onDone: () => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-text">Väggar ({unit})</span>
      {points.slice(0, -1).map((_, i) => (
        <NumberField
          key={`edge-${i}`}
          label={`Vägg ${i + 1}`}
          value={edgeLength(points, i)}
          min={0}
          onDone={onDone}
          onValue={(length) => onChange(setEdgeLength(points, i, length))}
        />
      ))}
      {closed && points.length > 2 && (
        <p className="m-0 text-sm text-text-muted">
          Vägg {points.length}: {formatLength(distance(points[points.length - 1], points[0]), unit)} (sluter formen)
        </p>
      )}
      <span className="mt-1 text-sm font-semibold text-text">Punkter</span>
      {points.map((p, i) => (
        <div key={`pt-${i}`} className="grid grid-cols-2 gap-2">
          <NumberField label={`X${i + 1}`} value={p.x} onDone={onDone} onValue={(x) => onChange(points.map((q, j) => (j === i ? { ...q, x } : q)))} />
          <NumberField label={`Y${i + 1}`} value={p.y} onDone={onDone} onValue={(y) => onChange(points.map((q, j) => (j === i ? { ...q, y } : q)))} />
        </div>
      ))}
    </div>
  )
}

/** Marks a shape as a surface to cover, an opening to subtract, or neither. */
function RoleField({
  role,
  onChange,
  onDone,
}: {
  role: DrawingRole | undefined
  onChange: (role: DrawingRole | undefined) => void
  onDone: () => void
}) {
  return (
    <Field label="Typ av yta">
      <select
        className={fieldInputClass}
        value={role ?? ""}
        onChange={(e) => {
          onChange((e.target.value || undefined) as DrawingRole | undefined)
          onDone()
        }}
      >
        <option value="">Ingen (enbart ritning)</option>
        <option value="surface">Yta att täcka (t.ex. fasad)</option>
        <option value="opening">Öppning (fönster, dörr)</option>
      </select>
    </Field>
  )
}

type Props = {
  el: DrawingElement
  unit: DrawingUnit
  onEdit: (next: DrawingElement) => void
  onEditEnd: () => void
  onDelete: () => void
}

export function PropertiesPanel({ el, unit, onEdit, onEditEnd, onDelete }: Props) {
  const fields = (() => {
    switch (el.type) {
      case "line": {
        const length = distance({ x: el.x1, y: el.y1 }, { x: el.x2, y: el.y2 })
        return (
          <NumberField
            label={`Längd (${unit})`}
            value={length}
            min={0}
            onDone={onEditEnd}
            onValue={(next) => {
              const ux = length === 0 ? 1 : (el.x2 - el.x1) / length
              const uy = length === 0 ? 0 : (el.y2 - el.y1) / length
              onEdit({ ...el, x2: el.x1 + ux * next, y2: el.y1 + uy * next })
            }}
          />
        )
      }
      case "rect":
        return (
          <>
            <NumberField label={`Bredd (${unit})`} value={el.width} min={0} onDone={onEditEnd} onValue={(width) => onEdit({ ...el, width })} />
            <NumberField label={`Höjd (${unit})`} value={el.height} min={0} onDone={onEditEnd} onValue={(height) => onEdit({ ...el, height })} />
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="X" value={el.x} onDone={onEditEnd} onValue={(x) => onEdit({ ...el, x })} />
              <NumberField label="Y" value={el.y} onDone={onEditEnd} onValue={(y) => onEdit({ ...el, y })} />
            </div>
            <RoleField role={el.role} onChange={(role) => onEdit({ ...el, role })} onDone={onEditEnd} />
          </>
        )
      case "polygon":
        return (
          <>
            <RoleField role={el.role} onChange={(role) => onEdit({ ...el, role })} onDone={onEditEnd} />
            <PointsEditor
              points={el.points.map(([x, y]) => ({ x, y }))}
              closed
              unit={unit}
              onChange={(points) => onEdit({ ...el, points: points.map((p): [number, number] => [p.x, p.y]) })}
              onDone={onEditEnd}
            />
          </>
        )
      case "polyline":
        return (
          <PointsEditor
            points={el.points}
            unit={unit}
            onChange={(points) => onEdit({ ...el, points })}
            onDone={onEditEnd}
          />
        )
      case "ellipse":
        return (
          <>
            <NumberField label={`Radie X (${unit})`} value={el.rx} min={0} onDone={onEditEnd} onValue={(rx) => onEdit({ ...el, rx })} />
            <NumberField label={`Radie Y (${unit})`} value={el.ry} min={0} onDone={onEditEnd} onValue={(ry) => onEdit({ ...el, ry })} />
          </>
        )
      case "dimension":
        return (
          <>
            <p className="m-0 text-sm text-text-muted">Mått: {formatLength(dimensionGeometry(el).length, unit)}</p>
            <NumberField label={`Avstånd till mållinje (${unit})`} value={el.offset} onDone={onEditEnd} onValue={(offset) => onEdit({ ...el, offset })} />
          </>
        )
      case "text":
        return (
          <>
            <Field label="Text">
              <input
                type="text"
                className={fieldInputClass}
                value={el.text}
                onBlur={onEditEnd}
                onChange={(e) => onEdit({ ...el, text: e.target.value })}
              />
            </Field>
            <NumberField label={`Textstorlek (${unit}, 0 = standard)`} value={el.size ?? 0} min={0} onDone={onEditEnd} onValue={(size) => onEdit({ ...el, size: size || undefined })} />
          </>
        )
      case "note":
        return (
          <Field label="Notering">
            <textarea
              className={fieldInputClass}
              rows={4}
              value={el.text}
              onBlur={onEditEnd}
              onChange={(e) => onEdit({ ...el, text: e.target.value })}
            />
          </Field>
        )
    }
  })()

  return (
    <div className="flex flex-col gap-3">
      {fields}
      <Button type="button" variant="secondary" size="sm" onClick={onDelete} className="self-start">
        <Trash2 size={14} />
        Ta bort
      </Button>
    </div>
  )
}
