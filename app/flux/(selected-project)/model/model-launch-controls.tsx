"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { Button } from "@/app/components/ui/Button"
import { generateImplementationPlan } from "./_actions/launch"

export function ModelLaunchControls({
  projectId,
  entityCount,
  scaffoldTarget,
}: {
  projectId: string
  entityCount: number
  scaffoldTarget: string
}) {
  const [pending, startTransition] = useTransition()
  const [notice, setNotice] = useState<string | null>(null)

  const generatePlan = () => {
    setNotice(null)
    startTransition(async () => {
      const result = await generateImplementationPlan(projectId)
      if (result.error) {
        setNotice(result.error)
        return
      }
      const created = result.data?.createdCount ?? 0
      setNotice(created ? created + " uppgifter skapades." : "Implementationplanen är uppdaterad.")
    })
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Link href={"/model/scaffold?target=" + scaffoldTarget} className="inline-flex min-h-9 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium text-text no-underline transition-colors hover:border-accent/50 hover:text-accent">
          Hämta boilerplate
        </Link>
        <Button type="button" variant="primary" size="sm" disabled={entityCount === 0 || pending} onClick={generatePlan} className="min-h-9 justify-center rounded-md">
          {pending ? "Skapar plan..." : "Skapa implementationplan"}
        </Button>
      </div>
      {notice && <p role="status" className="mt-3 text-sm text-text-muted">{notice}</p>}
    </div>
  )
}
