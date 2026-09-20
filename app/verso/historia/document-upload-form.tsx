"use client"

import { useRef, useState } from "react"
import { createDocument } from "@/app/actions/history"
import { Field, fieldInputClass } from "@/app/components/form/Field"
import { Button } from "@/app/components/ui/Button"
import { useDrawerClose } from "@/app/components/ui/Drawer"
import { uploadFile } from "@/app/lib/upload-file"

/** Uploads any files as documents. Details (date, source, people) are filled in afterwards. */
export function DocumentUploadForm({ onUploaded }: { onUploaded?: (ids: string[]) => void }) {
  const closeDrawer = useDrawerClose()
  const inputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | undefined>()
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    const files = Array.from(inputRef.current?.files ?? [])
    if (files.length === 0) {
      setError("Välj minst en fil.")
      return
    }

    setPending(true)
    setError(undefined)
    const createdIds: string[] = []
    let failed = 0
    for (const [index, file] of files.entries()) {
      setProgress(`Laddar upp ${index + 1} av ${files.length}...`)
      try {
        const url = await uploadFile(file)
        const result = await createDocument(
          { url, file_name: file.name, content_type: file.type, size: file.size },
          {
            title: file.name.replace(/\.[^.]+$/, "") || file.name,
            date_precision: "day",
            tags: [],
            people: [],
          }
        )
        if (result?.id) createdIds.push(result.id)
        else failed++
      } catch {
        failed++
      }
    }
    setProgress(null)
    setPending(false)

    if (createdIds.length > 0) onUploaded?.(createdIds)
    if (failed > 0) {
      setError(`${failed} av ${files.length} filer kunde inte laddas upp.`)
      return
    }
    closeDrawer()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <Field label="Filer">
        <input ref={inputRef} type="file" multiple className={fieldInputClass} />
      </Field>
      <p className="m-0 text-xs text-text-faint">
        PDF, kartor, skrifter eller vilka filer som helst. Titeln blir filnamnet tills du ändrar den.
      </p>
      {progress && <p className="text-sm text-text-muted">{progress}</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="mt-2 flex justify-end">
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? "Laddar upp..." : "Ladda upp"}
        </Button>
      </div>
    </form>
  )
}
