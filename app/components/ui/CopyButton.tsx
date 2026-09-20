"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { Button } from "./Button"

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.setAttribute("readonly", "")
  textarea.style.position = "fixed"
  textarea.style.opacity = "0"
  document.body.appendChild(textarea)
  textarea.select()

  try {
    if (!document.execCommand("copy")) throw new Error("Kopieringen misslyckades.")
  } finally {
    document.body.removeChild(textarea)
  }
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await copyText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => void handleCopy()}
      aria-label={copied ? "Kopierat" : "Kopiera"}
    >
      {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
      {copied ? "Kopierat" : "Kopiera"}
    </Button>
  )
}
