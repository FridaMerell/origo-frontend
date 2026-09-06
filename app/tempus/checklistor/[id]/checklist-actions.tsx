"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown } from "lucide-react"
import { Button } from "@/app/components/ui/Button"
import { useConfirmDialog } from "@/app/components/ui/useConfirmDialog"
import {
  deleteChecklist,
  syncChecklistCategory,
  syncChecklistObservations,
} from "@/app/tempus/_actions/checklists"

export default function ChecklistActions({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [pendingAction, setPendingAction] = useState<"category" | "observations" | "delete" | null>(null)
  const [syncMenuOpen, setSyncMenuOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { requestConfirm, dialog } = useConfirmDialog()

  const remove = () => {
    requestConfirm({
      title: "Ta bort checklista",
      message: `Ta bort checklistan "${name}"? Det går inte att ångra.`,
      confirmLabel: "Ta bort",
      destructive: true,
      onConfirm: () => {
        setError(null)
        setPendingAction("delete")
        startTransition(async () => {
          try {
            const result = await deleteChecklist(id)
            if (result.error) {
              setError(result.error)
              return
            }
            router.push("/checklistor")
          } finally {
            setPendingAction(null)
          }
        })
      },
    })
  }

  const sync = (
    actionName: "category" | "observations",
    action: (checklistId: string) => Promise<{ error?: string }>,
  ) => {
    setError(null)
    setSyncMenuOpen(false)
    setPendingAction(actionName)
    startTransition(async () => {
      try {
        const result = await action(id)
        if (result.error) setError(result.error)
      } finally {
        setPendingAction(null)
      }
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Button
            type="button"
            variant="paper"
            className="underline underline-offset-4"
            onClick={() => setSyncMenuOpen((open) => !open)}
            disabled={pending}
            aria-haspopup="menu"
            aria-expanded={syncMenuOpen}
            rounded="rounded-none"
            size="sm"
          >
            Synkronisera
            <ChevronDown size={14} className={`transition-transform ${syncMenuOpen ? "rotate-180" : ""}`} />
          </Button>
          {syncMenuOpen ? (
            <>
              <button
                type="button"
                aria-label="Stäng synkroniseringsmenyn"
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setSyncMenuOpen(false)}
              />
              <div
                role="menu"
                aria-label="Synkronisera checklista"
                className="absolute left-0 top-full z-20 mt-1.5 w-52 rounded border border-border bg-surface p-1 shadow-md"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => sync("category", syncChecklistCategory)}
                  disabled={pending}
                  className="flex w-full rounded px-2.5 py-2 text-left text-sm hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pendingAction === "category" ? "Synkar underarter…" : "Synka underarter"}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => sync("observations", syncChecklistObservations)}
                  disabled={pending}
                  className="flex w-full rounded px-2.5 py-2 text-left text-sm hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pendingAction === "observations" ? "Synkar observationer…" : "Synka observationer"}
                </button>
              </div>
            </>
          ) : null}
        </div>
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
          {pendingAction === "delete" ? "Tar bort…" : "Ta bort"}
        </button>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {dialog}
    </div>
  )
}
