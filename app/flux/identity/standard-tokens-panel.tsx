"use client"

import { useState } from "react"
import { SwatchBookIcon } from "lucide-react"
import { Button } from "@/app/components/ui/Button"
import { fieldInputClass } from "@/app/components/form/Field"
import type { IdentityColor, IdentityThemeModes } from "@/app/lib/dal"
import {
  DEFAULT_TOKEN_CHOICE,
  HUE_FAMILIES,
  NEUTRAL_FAMILIES,
  buildStandardTokens,
  type StandardTokenChoice,
} from "./tailwind-palette"

/** Adds the usual design tokens (background, surface, text, muted, border, primary ...) in one step. */
export function StandardTokensPanel({
  themeModes,
  existing,
  onAdd,
}: {
  themeModes: IdentityThemeModes
  existing: Pick<IdentityColor, "name" | "role">[]
  onAdd: (colors: IdentityColor[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [choice, setChoice] = useState<StandardTokenChoice>(DEFAULT_TOKEN_CHOICE)
  const [added, setAdded] = useState<number | null>(null)

  const tokens = buildStandardTokens({ choice, themeModes, existing })
  const pick = (key: keyof StandardTokenChoice, value: string) => setChoice((current) => ({ ...current, [key]: value }))

  if (!open) {
    return (
      <div className="flex flex-col items-start gap-1">
        <Button type="button" variant="secondary" size="sm" onClick={() => { setOpen(true); setAdded(null) }}>
          <SwatchBookIcon size={14} />
          Standardtokens
        </Button>
        {added !== null && (
          <span role="status" className="text-xs text-text-muted">
            {added === 0 ? "Alla standardtokens finns redan." : `Lade till ${added} tokens.`}
          </span>
        )}
      </div>
    )
  }

  const select = (label: string, key: keyof StandardTokenChoice, families: string[]) => (
    <label className="flex flex-col gap-1 text-sm text-text-muted">
      {label}
      <select className={fieldInputClass} value={choice[key]} onChange={(event) => pick(key, event.target.value)}>
        {families.map((family) => <option key={family} value={family}>{family}</option>)}
      </select>
    </label>
  )

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-bg p-3">
      <p className="text-xs text-text-muted">
        Lägger till background, surface, text, muted, border, primary, secondary, accent, success, warning och danger,
        med värden ur Tailwinds palett för både ljust och mörkt. Roller som redan finns hoppas över, och du kan ändra allt efteråt.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        {select("Primärfärg", "primary", HUE_FAMILIES)}
        {select("Accent", "accent", HUE_FAMILIES)}
        {select("Gråskala", "neutral", NEUTRAL_FAMILIES)}
      </div>

      <ul className="flex flex-wrap gap-2" aria-label="Tokens som läggs till">
        {tokens.map((token) => (
          <li key={token.name} className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="flex h-4 w-6 overflow-hidden rounded border border-border" aria-hidden="true">
              {themeModes !== "dark" && <span className="flex-1" style={{ backgroundColor: token.light }} />}
              {themeModes !== "light" && <span className="flex-1" style={{ backgroundColor: token.dark }} />}
            </span>
            {token.name}
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Avbryt</Button>
        <Button
          type="button"
          size="sm"
          disabled={tokens.length === 0}
          onClick={() => {
            onAdd(tokens)
            setAdded(tokens.length)
            setOpen(false)
          }}
        >
          {tokens.length === 0 ? "Alla finns redan" : `Lägg till ${tokens.length} tokens`}
        </Button>
      </div>
    </div>
  )
}
