"use client"

import { useMemo, useState } from "react"
import { FileCode2Icon, XIcon } from "lucide-react"
import { Button } from "@/app/components/ui/Button"
import { Field, fieldInputClass } from "@/app/components/form/Field"
import { parseThemeCss, type ImportedTheme } from "./theme-import"

export function ThemeImportPanel({ onApply }: { onApply: (theme: ImportedTheme) => void }) {
  const [open, setOpen] = useState(false)
  const [source, setSource] = useState("")
  const result = useMemo(() => parseThemeCss(source), [source])
  const hasSource = source.trim().length > 0

  if (!open) {
    return <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}><FileCode2Icon size={14} />Importera tema</Button>
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-bg p-4">
      <div className="flex items-start justify-between gap-3">
        <div><h4 className="text-sm font-semibold text-text">Importera från CSS</h4><p className="mt-1 text-xs text-text-muted">Klistra in Lovable/Tailwind-temats globals.css. Färger, mörkt läge, typsnitt och radier läses ut.</p></div>
        <button type="button" aria-label="Stäng import" className="rounded-md p-1 text-text-faint hover:bg-surface-2 hover:text-text" onClick={() => setOpen(false)}><XIcon size={16} /></button>
      </div>
      <Field label="CSS-tema">
        <textarea rows={8} className={`${fieldInputClass} resize-y font-mono text-xs`} value={source} onChange={(event) => setSource(event.target.value)} placeholder=":root { --primary: oklch(...); }\n.dark { --primary: oklch(...); }" />
      </Field>
      {hasSource && (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-surface p-3 text-xs">
          <p className="font-medium text-text">{result.colors.length} färger · {result.themeModes === "both" ? "ljust + mörkt" : result.themeModes} · {result.radii.length ? "radier hittade" : "inga radier hittade"}</p>
          {result.warnings.map((warning) => <p key={warning} className="text-danger">{warning}</p>)}
        </div>
      )}
      <div className="flex justify-end gap-2"><Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Avbryt</Button><Button type="button" size="sm" disabled={!hasSource || result.colors.length === 0} onClick={() => { onApply(result); setOpen(false) }}>Importera till identitet</Button></div>
    </div>
  )
}
