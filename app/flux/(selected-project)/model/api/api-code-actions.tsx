"use client"

import { useState, useTransition } from "react"
import { Check, Copy, Download, FileText } from "lucide-react"
import { Button } from "@/app/components/ui/Button"
import type { FluxScaffoldTarget } from "@/app/lib/dal"
import { createScaffoldDocument } from "./_actions/scaffold"

export function ApiCodeActions({
  content,
  path,
  projectId,
  target,
}: {
  content: string
  path: string
  projectId: string
  target: FluxScaffoldTarget
}) {
  const [copied, setCopied] = useState(false)
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState("")

  const copy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const download = () => {
    const href = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }))
    const anchor = document.createElement("a")
    anchor.href = href
    anchor.download = path.split("/").at(-1) ?? "generated-file.txt"
    anchor.click()
    URL.revokeObjectURL(href)
  }

  const saveDocument = () => {
    setResult("")
    startTransition(async () => {
      const response = await createScaffoldDocument(projectId, target)
      setResult(response.error ?? `Skapade ${response.data?.title ?? "scaffold-dokumentet"}.`)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
      <Button type="button" variant="secondary" size="sm" onClick={() => void copy()}><Copy size={14} />{copied ? "Kopierat" : "Kopiera fil"}</Button>
      <Button type="button" variant="secondary" size="sm" onClick={download}><Download size={14} />Ladda ned</Button>
      <Button type="button" variant="primary" size="sm" onClick={saveDocument} disabled={pending}><FileText size={14} />{pending ? "Skapar..." : "Skapa scaffold-dokument"}</Button>
      {copied && <Check size={15} className="text-success" aria-label="Kopierat" />}
      {result && <p className="text-xs text-text-muted">{result}</p>}
    </div>
  )
}
