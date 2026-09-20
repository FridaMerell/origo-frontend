"use client"

import { useMemo, useState } from "react"
import { PaletteIcon, PlusIcon, XIcon } from "lucide-react"
import { Button } from "@/app/components/ui/Button"
import { Field, fieldInputClass } from "@/app/components/form/Field"
import type { IdentityColor, IdentityThemeModes } from "@/app/lib/dal"
import { parseColor } from "./color-parse"
import { colorConversions, matchingColors } from "./color-utils"

const OUTPUTS = [
  ["Hex", "hex"],
  ["RGB", "rgb"],
  ["HSL", "hsl"],
  ["OKLCH", "oklch"],
] as const

/** A compact conversion and hue-harmony helper for colours added to an identity. */
export function ColorToolbox({
  themeModes,
  onAdd,
}: {
  themeModes: IdentityThemeModes
  onAdd: (color: IdentityColor) => void
}) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("#3b82f6")
  const conversion = useMemo(() => colorConversions(input), [input])
  const matches = useMemo(() => matchingColors(input), [input])
  const parsed = parseColor(input)

  const addColor = (name: string, hex: string) => {
    onAdd({
      name,
      role: "",
      light: themeModes === "dark" ? "" : hex,
      dark: themeModes === "light" ? "" : hex,
    })
  }

  if (!open) {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <PaletteIcon size={14} />
        Färgverktyg
      </Button>
    )
  }

  return (
    <div className="relative">
      <div className="absolute left-0 z-10 mt-2 flex w-[min(32rem,calc(100vw-5rem))] flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-text">Färgverktyg</h4>
            <p className="text-xs text-text-muted">Omvandla en färg och lägg till matchande nyanser.</p>
          </div>
          <button type="button" aria-label="Stäng färgverktyg" className="rounded-md p-1 text-text-faint hover:bg-surface-2 hover:text-text" onClick={() => setOpen(false)}>
            <XIcon size={16} />
          </button>
        </div>

        <Field label="Färg att omvandla">
          <input
            type="text"
            className={`${fieldInputClass} font-mono`}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="#2563eb eller oklch(...)"
          />
        </Field>

        {conversion ? (
          <>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 size-12 shrink-0 rounded-md border border-border" style={{ backgroundColor: conversion.hex }} aria-label={`Färgprov ${conversion.hex}`} />
              <dl className="grid min-w-0 flex-1 gap-x-3 gap-y-1 text-xs sm:grid-cols-[3.5rem_minmax(0,1fr)]">
                {OUTPUTS.map(([label, key]) => (
                  <div key={key} className="contents">
                    <dt className="text-text-faint">{label}</dt>
                    <dd className="min-w-0 truncate font-mono text-text" title={conversion[key]}>{conversion[key]}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <h5 className="text-xs font-semibold uppercase tracking-wide text-text-faint">Matchande färger</h5>
                <Button type="button" variant="ghost" size="sm" onClick={() => addColor("Basfärg", conversion.hex)}>
                  <PlusIcon size={14} />
                  Lägg till bas
                </Button>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {matches.map((match) => (
                  <li key={match.name}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-md border border-border bg-bg px-2 py-1.5 text-left text-xs text-text transition-colors hover:bg-surface-2"
                      onClick={() => addColor(match.name, match.hex)}
                    >
                      <span className="size-5 shrink-0 rounded border border-border" style={{ backgroundColor: match.hex }} aria-hidden="true" />
                      <span className="min-w-0 flex-1">{match.name}</span>
                      <span className="font-mono text-text-muted">{match.hex}</span>
                      <PlusIcon size={13} className="text-text-faint" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <p role="alert" className="text-sm text-danger">
            {"error" in parsed ? parsed.error : "Färgen kunde inte läsas."}
          </p>
        )}
      </div>
    </div>
  )
}
