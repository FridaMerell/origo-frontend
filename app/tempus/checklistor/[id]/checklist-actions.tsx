"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown } from "lucide-react"
import { Button } from "@/app/components/ui/Button"
import { useToast } from "@/app/components/ui/ToastProvider"
import { useConfirmDialog } from "@/app/components/ui/useConfirmDialog"
import type { TempusSpeciesCategory } from "@/app/lib/dal"
import {
  deleteChecklist,
  syncChecklistCategory,
  syncChecklistObservations,
} from "@/app/tempus/_actions/checklists"

export default function ChecklistActions({
  id,
  name,
  categories,
}: {
  id: string
  name: string
  categories: TempusSpeciesCategory[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [pendingAction, setPendingAction] = useState<"category" | "observations" | "delete" | null>(null)
  const [syncMenuOpen, setSyncMenuOpen] = useState(false)
  const [speciesCategoryId, setSpeciesCategoryId] = useState("")
  const [categoryQuery, setCategoryQuery] = useState("")
  const [error, setError] = useState<string | null>(null)
  const { requestConfirm, dialog } = useConfirmDialog()
  const { toast } = useToast()
  const categoryMatches = useMemo(() => {
    const query = categoryQuery.trim().toLocaleLowerCase("sv")
    if (!query) return []
    return categories
      .filter((category) => category.label.toLocaleLowerCase("sv").includes(query))
      .slice(0, 8)
  }, [categories, categoryQuery])

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
              toast({ title: "Kunde inte ta bort checklistan", description: result.error, variant: "error" })
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

  const sync = (actionName: "category" | "observations", action: () => Promise<{ error?: string }>) => {
    setError(null)
    setSyncMenuOpen(false)
    setPendingAction(actionName)
    startTransition(async () => {
      try {
        const result = await action()
        if (result.error) {
          setError(result.error)
          toast({ title: "Synkroniseringen misslyckades", description: result.error, variant: "error" })
          return
        }
        toast({
          title: actionName === "category" ? "Underarter synkroniserade" : "Observationer har synkats",
          variant: "success",
        })
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
              <div className="absolute left-0 top-full z-20 mt-1.5 w-64 rounded border border-border bg-surface p-2 shadow-md">
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    if (speciesCategoryId) sync("category", () => syncChecklistCategory(id, speciesCategoryId))
                  }}
                >
                  <label className="block text-xs text-text-muted">
                    Kategori
                    <input
                      type="search"
                      value={categoryQuery}
                      onChange={(event) => {
                        setCategoryQuery(event.target.value)
                        setSpeciesCategoryId("")
                      }}
                      disabled={pending}
                      placeholder="Sök kategori"
                      className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-sm text-text placeholder:text-text-faint disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </label>
                  {categoryMatches.length > 0 ? (
                    <ul className="mt-1 max-h-40 overflow-y-auto rounded border border-border py-1">
                      {categoryMatches.map((category) => (
                        <li key={category.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSpeciesCategoryId(category.id)
                              setCategoryQuery(category.label)
                            }}
                            className={`w-full px-2 py-1.5 text-left text-sm hover:bg-surface-2 ${speciesCategoryId === category.id ? "bg-accent-wash text-accent" : ""}`}
                          >
                            {category.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <button
                    type="submit"
                    disabled={pending || !speciesCategoryId}
                    className="mt-2 flex w-full rounded px-2.5 py-2 text-left text-sm hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {pendingAction === "category" ? "Synkar underarter…" : "Synka underarter"}
                  </button>
                </form>
                <button
                  type="button"
                  onClick={() => sync("observations", () => syncChecklistObservations(id))}
                  disabled={pending}
                  className="flex w-full rounded px-2.5 py-2 text-left text-sm hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pendingAction === "observations" ? "Synkronisera alla observationer" : "Synkronisera observationer"}
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
