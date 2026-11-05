"use client"

import { useTransition } from "react"
import { Button } from "@/app/components/ui/Button"
import { useToast } from "@/app/components/ui/ToastProvider"
import { useConfirmDialog } from "@/app/components/ui/useConfirmDialog"
import { rebuildCategoryPhenograms } from "@/app/tempus/_actions/species"

export default function RebuildPhenogramsButton({ categoryId, categoryLabel }: { categoryId: string; categoryLabel: string }) {
  const [isPending, startTransition] = useTransition()
  const { requestConfirm, dialog } = useConfirmDialog()
  const { toast } = useToast()

  const rebuild = () => {
    startTransition(async () => {
      try {
        const result = await rebuildCategoryPhenograms(categoryId)
        if (result.ok) {
          toast({ title: "Ombygge köat", description: `${categoryLabel}: hela landet och alla områden.`, variant: "success" })
          return
        }
        toast({ title: "Kunde inte köa ombygge", description: result.error ?? "Något gick fel. Försök igen.", variant: "error" })
      } catch {
        toast({ title: "Kunde inte köa ombygge", description: "Kunde inte kontakta servern. Försök igen.", variant: "error" })
      }
    })
  }

  return (
    <>
      <Button
        type="button"
        variant="paper"
        className="text-sm"
        disabled={isPending}
        onClick={() => requestConfirm({
          title: "Bygg om fenogram",
          message: `Alla arter i ${categoryLabel} byggs om för hela landet och alla områden.`,
          confirmLabel: "Bygg om",
          onConfirm: rebuild,
        })}
      >
        Bygg om fenogram
      </Button>
      {dialog}
    </>
  )
}
