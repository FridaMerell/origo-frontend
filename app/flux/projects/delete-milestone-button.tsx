"use client"

import { deleteMilestone } from "@/app/actions/flux/milestones"
import { DeleteButton } from "@/app/components/ui/DeleteButton"
import { useFluxMilestoneActions, useFluxMilestones } from "@/app/flux/_state/flux-context"

export function DeleteMilestoneButton({ id }: { id: number }) {
  const milestones = useFluxMilestones()
  const { addMilestone, removeMilestone } = useFluxMilestoneActions()
  const milestone = milestones.find((item) => item.id === id)

  return (
    <DeleteButton
      label="Ta bort delmål"
      confirmTitle="Ta bort delmål"
      confirmMessage="Ta bort det här delmålet? Uppgifter kopplade till det påverkas inte, men själva delmålet går inte att återställa."
      showTitle
      stopPropagation
      className="rounded-md p-1 text-text-faint transition-colors hover:bg-danger-wash hover:text-danger disabled:opacity-50"
      onDelete={async () => {
        removeMilestone(id)
        const result = await deleteMilestone(id)
        if (result?.error && milestone) addMilestone(milestone)
      }}
    />
  )
}
