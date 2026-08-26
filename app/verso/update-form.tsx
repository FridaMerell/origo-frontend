"use client"

import { useActionState, useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { VersoUpdate } from "../lib/dal"
import { createVersoUpdate, updateVersoUpdate, type CreateVersoUpdateState } from "../actions/verso-update"
import { Button } from "../components/ui/Button"
import { FileUpload, type UploadedFile } from "../components/ui/FileUpload"
import { VentureTaskLinkPicker, type VentureTaskLinkValue } from "./ui/VentureTaskLinkPicker"

const initialState: CreateVersoUpdateState = undefined

const UpdateForm = ({
  update,
  defaultVenture,
  defaultTask,
}: {
  update?: VersoUpdate
  defaultVenture?: string
  defaultTask?: string
}) => {
  const [state, formAction, pending] = useActionState(
    update ? updateVersoUpdate : createVersoUpdate,
    initialState
  )
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (state?.success) router.refresh()
  }, [state, router])
  const [files, setFiles] = useState<UploadedFile[]>(
    (update?.files ?? []).map((url) => ({ url, name: url.split("/").pop() ?? url }))
  )
  const [link, setLink] = useState<VentureTaskLinkValue>({
    linkType: update?.task || defaultTask ? "task" : "venture",
    linkId: update?.task ?? update?.venture ?? defaultTask ?? defaultVenture ?? null,
  })

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="path" value={pathname} />
      {update && <input type="hidden" name="id" value={update.id} />}
      <label className="flex flex-col gap-1 text-sm text-text-muted">
        Rubrik
        <input
          type="text"
          name="title"
          required
          defaultValue={update?.title}
          className="rounded border border-field-border bg-surface px-2.5 py-1.5 text-text"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-text-muted">
        Uppdatering
        <textarea
          name="content"
          required
          defaultValue={update?.content}
          className="rounded border border-field-border bg-surface px-2.5 py-1.5 text-text"
        />
      </label>

      <VentureTaskLinkPicker value={link} onChange={setLink} />

      <div className="flex flex-col gap-1 text-sm text-text-muted">
        Bilagor
        <FileUpload folder="verso" files={files} onChange={setFiles} />
      </div>

      {files.map((file) => (
        <input key={file.url} type="hidden" name="files" value={file.url} />
      ))}

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}

      <div className="mt-2 flex justify-end">
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? "Sparar..." : "Spara"}
        </Button>
      </div>
    </form>
  )
}

export default UpdateForm
