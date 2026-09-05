"use client"

import { useActionState, useRef, useState } from "react"
import { importSpeciesChecklist, type ImportSpeciesChecklistState } from "@/app/tempus/_actions/species"
import { Button } from "@/app/components/ui/Button"
import { ChevronDown, FileCheck, FileUp, Upload } from "lucide-react"

const initialState: ImportSpeciesChecklistState = {}

type Props = {
  categoryId: string
  categoryLabel: string
}

export default function ImportSpeciesChecklistForm({ categoryId, categoryLabel }: Props) {
  const formRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const action = async (previousState: ImportSpeciesChecklistState, formData: FormData) => {
    const result = await importSpeciesChecklist(categoryId, previousState, formData)
    if (result.success) {
      formRef.current?.reset()
      setFileName(null)
    }
    return result
  }
  const [state, formAction, pending] = useActionState(action, initialState)

  const chooseFile = (file: File | undefined) => {
    if (!file || !inputRef.current) return
    const transfer = new DataTransfer()
    transfer.items.add(file)
    inputRef.current.files = transfer.files
    setFileName(file.name)
  }

  return (
    <section className="overflow-hidden rounded-card border border-border bg-surface-2">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        disabled={pending}
        aria-expanded={isOpen}
        aria-controls="species-checklist-import-form"
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-accent-wash/40 disabled:cursor-not-allowed sm:p-5"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-wash text-accent">
          <FileUp size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-semibold">Importera artlista</h2>
          <p className="mt-0.5 text-sm text-text-muted">
            Lägg till arter i {categoryLabel} från en CSV med kolumnen <span className="font-mono">Taxon id</span>.
          </p>
        </div>
        <ChevronDown
          size={18}
          className={`text-text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <form
        id="species-checklist-import-form"
        ref={formRef}
        action={formAction}
        hidden={!isOpen}
        className="flex flex-col gap-3 border-t border-border p-4 sm:p-5"
      >
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") inputRef.current?.click()
          }}
          onDragOver={(event) => {
            event.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragOver(false)
            chooseFile(event.dataTransfer.files[0])
          }}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded border border-dashed px-5 py-6 text-center transition-colors ${
            dragOver
              ? "border-accent bg-accent-wash text-accent"
              : "border-border bg-surface text-text-muted hover:border-accent hover:text-text"
          }`}
        >
          {
            fileName ? (
              <FileCheck size={20} className="text-success" />
            ) : (
              <Upload size={20} />
            )
          }
          <div>
            <p className="break-all text-sm font-semibold text-text">
              {fileName ?? "Släpp en CSV här eller välj fil"}
            </p>
            <p className="mt-1 text-xs">UTF-8 · semikolon, komma eller tabb</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            name="file"
            accept=".csv,text/csv"
            required
            className="hidden"
            onChange={(event) => setFileName(event.target.files?.[0]?.name ?? null)}
          />
        </div>
        {pending && (
          <p className="text-sm text-text-faint" role="status">Filen importeras asynkront. Kom tillbaka om en stund</p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="paper-bordered" disabled={pending || !fileName}>
            {pending ? "Importerar…" : "Importera arter"}
          </Button>
          <p className="text-xs text-text-faint">Endast personal kan genomföra importen.</p>
        </div>

        {state.error && (
          <p className="text-sm text-danger" role="alert">{state.error}</p>
        )}
        {state.success && state.message && (
          <p className="text-sm text-success" role="status">{state.message}</p>
        )}
      </form>
    </section>
  )
}
