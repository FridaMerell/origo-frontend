"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/app/components/ui/Button"
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
        <Button type="button" variant="paper" className="underline underline-offset-4" onClick={() => router.push(`/checklistor/${id}/redigera`)}
          rounded="rounded-none"
          size="sm"
          
        >
          Redigera
        </Button>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="font-display text-sm italic text-text-muted underline underline-offset-4 hover:text-danger disabled:opacity-50"
        >
          {pending ? "Tar bort…" : "Ta bort"}
        </button>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  )
}
