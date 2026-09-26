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
      <div className="grid gap-2 sm:flex sm:flex-wrap">
        <Link href={"/model/scaffold?target=" + scaffoldTarget} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-accent/40 px-3 text-sm font-medium text-accent no-underline hover:bg-accent/10">
          Hämta boilerplate
        </Link>
        <Button type="button" variant="primary" size="sm" disabled={entityCount === 0 || pending} onClick={generatePlan} className="min-h-10 w-full justify-center rounded-xl sm:w-auto">
          {pending ? "Skapar plan..." : "Skapa implementationplan"}
        </Button>
      </div>
      {notice && <p role="status" className="mt-3 text-sm text-text-muted">{notice}</p>}
    </div>
  )
}
