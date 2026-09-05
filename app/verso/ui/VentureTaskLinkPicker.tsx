"use client"

import { useMemo, useState } from "react"
import { useVentureData } from "@/app/verso/_state/venture-context"
import { PillSelect } from "@/app/components/ui/PillSelect"
import { Select } from "@/app/components/ui/Select"
import type { VentureTask } from "@/app/lib/dal"

export type VentureTaskLinkType = "venture" | "task"

export type VentureTaskLinkValue = {
  linkType: VentureTaskLinkType
  linkId: string | null
}

export function resolveVentureTaskLink(
  value: VentureTaskLinkValue,
  ventureTasks: VentureTask[]
): { venture: string | null; task: string | null } {
  if (value.linkType === "venture") {
    return { venture: value.linkId, task: null }
  }
  const task = ventureTasks.find((t) => String(t.id) === String(value.linkId))
  return { venture: task?.venture ?? null, task: value.linkId }
}

type VentureTaskLinkPickerProps = {
  value: VentureTaskLinkValue
  onChange: (value: VentureTaskLinkValue) => void
  className?: string
}

export function VentureTaskLinkPicker({ value, onChange, className = "" }: VentureTaskLinkPickerProps) {
  const { ventures, ventureTasks } = useVentureData()
  const [taskProjectFilter, setTaskProjectFilter] = useState<string | null>(
    value.linkType === "task"
      ? ventureTasks.find((t) => String(t.id) === String(value.linkId))?.venture ?? null
      : null
  )

  const projectOptions = useMemo(
    () => ventures.map((v) => ({ value: v.id, label: v.name })),
    [ventures]
  )

  const taskOptions = useMemo(
    () =>
      ventureTasks
        .filter((t) => !taskProjectFilter || t.venture === taskProjectFilter)
        .map((t) => ({ value: t.id, label: t.name })),
    [ventureTasks, taskProjectFilter]
  )

  function handleLinkTypeChange(next: VentureTaskLinkType) {
    setTaskProjectFilter(null)
    onChange({ linkType: next, linkId: null })
  }

  function handleTaskProjectFilterChange(next: string) {
    setTaskProjectFilter(next)
    onChange({ ...value, linkId: null })
  }

  return (
    <div className={`flex flex-col gap-1 text-sm text-text-muted ${className}`}>
      Koppla till
      <PillSelect
        options={[
          { value: "venture", label: "Projekt" },
          { value: "task", label: "Uppgift" },
        ]}
        value={value.linkType}
        onChange={handleLinkTypeChange}
      />
      {value.linkType === "task" && (
        <Select
          options={projectOptions}
          value={taskProjectFilter}
          onChange={handleTaskProjectFilterChange}
          placeholder="Filtrera på projekt..."
          className="mt-1"
        />
      )}
      <Select
        options={value.linkType === "venture" ? projectOptions : taskOptions}
        value={value.linkId}
        onChange={(linkId) => onChange({ ...value, linkId })}
        placeholder={value.linkType === "venture" ? "Välj projekt..." : "Välj uppgift..."}
        className="mt-1"
      />
    </div>
  )
}
