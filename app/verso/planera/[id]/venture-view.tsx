"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import type { Album, Drawing, Photo, PhotoTag } from "@/app/lib/dal"
import { PhotoGrid } from "@/app/verso/bilder/photo-grid"
import { PhotoUploadForm } from "@/app/verso/bilder/photo-upload-form"
import { DrawingForm } from "@/app/verso/ritningar/drawing-form"
import { useUpdateData, useVentureData } from "@/app/verso/_state/verso-context"
import { Card } from "@/app/components/ui/Card"
import { Badge } from "@/app/components/ui/Badge"
import { Drawer } from "@/app/components/ui/Drawer"
import { Gallery } from "@/app/components/ui/Gallery"
import { Tabs, type TabItem } from "@/app/components/ui/Tabs"
import UpdateForm from "@/app/verso/forms/update-form"
import { UpdateCard } from "@/app/verso/updates/update-card"
import { VentureForm } from "@/app/verso/planera/venture-form"
import { VentureFilesForm } from "@/app/verso/forms/venture-files-form"
import { priorityLabel } from "@/app/verso/planera/venture-priority"
import {
  VentureExpenseList,
  VentureStats,
  VentureTaskList,
} from "@/app/verso/planera/[id]/venture-sections"
import { BackLink, DetailNotFound, SectionHeading } from "@/app/verso/ui/DetailPage"

type TabId = "activity" | "photos" | "drawings" | "expenses"

export default function VentureView({
  drawings,
  photos,
  albums,
  tags,
}: {
  drawings: Drawing[]
  photos: Photo[]
  albums: Album[]
  tags: PhotoTag[]
}) {
  const { id } = useParams<{ id: string }>()
  const { ventures, ventureTasks, expenses } = useVentureData()
  const { updates } = useUpdateData()
  const [tab, setTab] = useState<TabId>("activity")

  const venture = ventures.find((v) => String(v.id) === id)

  if (!venture) {
    return <DetailNotFound backHref="/planera" backLabel="Planering" message="Projektet kunde inte hittas." />
  }

  const tasks = ventureTasks.filter((t) => String(t.venture) === String(venture.id))
  const taskIds = new Set(tasks.map((t) => String(t.id)))
  const ventureUpdates = updates.filter(
    (u) => String(u.venture) === String(venture.id) || (u.task !== null && taskIds.has(String(u.task)))
  )
  const ventureExpenses = expenses.filter((e) => String(e.venture) === String(venture.id))
  const allFiles = Array.from(new Set([...venture.files, ...ventureUpdates.flatMap((u) => u.files)]))

  const tabs: TabItem<TabId>[] = [
    { id: "activity", label: "Uppgifter & uppdateringar", count: tasks.length + ventureUpdates.length },
    { id: "photos", label: "Bilder", count: photos.length },
    { id: "drawings", label: "Ritningar", count: drawings.length },
    { id: "expenses", label: "Utgifter", count: ventureExpenses.length },
  ]

  return (
    <div className="container flex min-w-0 flex-1 flex-col gap-5 py-5 sm:gap-6 sm:py-8">
      <BackLink href="/planera">Planering</BackLink>

      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <h1 className="m-0 font-display text-2xl font-semibold text-text">{venture.name}</h1>
          <Badge variant="accent">{priorityLabel(venture.priority)}</Badge>
        </div>
        <Drawer trigger="Redigera" triggerVariant="ghost" triggerSize="sm" title="Redigera projekt">
          <VentureForm venture={venture} />
        </Drawer>
      </div>

      <Card className="flex flex-col gap-4">
        {venture.description && (
          <p className="whitespace-pre-wrap text-sm text-text">{venture.description}</p>
        )}
        <VentureStats venture={venture} />

        <hr className="border-border" />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-text-faint">Bilagor</span>
          <Drawer trigger="Lägg till filer" triggerVariant="ghost" triggerSize="sm" title="Lägg till filer">
            <VentureFilesForm venture={venture} />
          </Drawer>
        </div>
        <Gallery files={allFiles} />
      </Card>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === "activity" && (
        <div className="flex flex-col gap-6">
          <VentureTaskList venture={venture} tasks={tasks} />

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <SectionHeading>Uppdateringar</SectionHeading>
              <Drawer trigger="Ny uppdatering" triggerVariant="secondary" triggerSize="sm" title="Ny uppdatering">
                <UpdateForm defaultVenture={venture.id} />
              </Drawer>
            </div>
            {ventureUpdates.length === 0 ? (
              <div className="text-sm text-text-muted">Inga uppdateringar ännu.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {ventureUpdates.map((update) => (
                  <UpdateCard
                    key={update.id}
                    update={update}
                    taskLabel={update.task ? (tasks.find((t) => String(t.id) === String(update.task))?.name ?? "Uppgift") : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "photos" && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <Drawer trigger="Ladda upp" triggerVariant="secondary" triggerSize="sm" title="Ladda upp bilder">
              <PhotoUploadForm albums={albums} tags={tags} defaultVenture={venture.id} />
            </Drawer>
          </div>
          {photos.length === 0 && <div className="text-sm text-text-muted">Inga bilder ännu.</div>}
          <PhotoGrid photos={photos} albums={albums} tags={tags} />
        </div>
      )}

      {tab === "drawings" && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <Drawer trigger="Ny ritning" triggerVariant="secondary" triggerSize="sm" title="Ny ritning">
              <DrawingForm defaultVenture={venture.id} />
            </Drawer>
          </div>
          {drawings.length === 0 ? (
            <div className="text-sm text-text-muted">Inga ritningar ännu.</div>
          ) : (
            <Card className="flex flex-col gap-0 p-0">
              {drawings.map((drawing) => (
                <Link
                  key={drawing.id}
                  href={`/ritningar/${drawing.id}`}
                  className="flex items-center justify-between gap-4 border-b border-border px-4 py-2.5 last:border-b-0 hover:bg-surface-2"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm text-text">{drawing.name}</span>
                    <span className="truncate text-xs text-text-faint">{drawing.description}</span>
                  </span>
                  <span className="shrink-0 text-xs text-text-faint">
                    {drawing.pages.length} {drawing.pages.length === 1 ? "sida" : "sidor"} · {drawing.unit}
                  </span>
                </Link>
              ))}
            </Card>
          )}
        </div>
      )}

      {tab === "expenses" && <VentureExpenseList venture={venture} expenses={ventureExpenses} />}
    </div>
  )
}
