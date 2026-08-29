"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/app/components/ui/Button"
import { Icon } from "@/app/components/ui/Icon"
import { deleteChecklist } from "@/app/actions/tempus"

export default function ChecklistActions({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const remove = () => {
    if (!window.confirm(`Ta bort checklistan "${name}"?`)) return
    setError(null)
    startTransition(async () => {
      const result = await deleteChecklist(id)
      if (result.error) {
        setError(result.error)
        return
      }
      router.push("/checklistor")
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <Button type="button" onClick={() => router.push(`/checklistor/${id}/redigera`)}>
          <Icon name="pencil" size={15} />
          Redigera
        </Button>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-danger disabled:opacity-50"
        >
          <Icon name="trash-2" size={15} />
          {pending ? "Tar bort…" : "Ta bort"}
        </button>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  )
}
