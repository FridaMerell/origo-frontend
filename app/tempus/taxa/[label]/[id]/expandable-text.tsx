"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/app/components/ui/Button"

export default function ExpandableText({ head, rest, moreLabel = "Visa hela texten", lessLabel = "Visa mindre" }: { head: string; rest: string; moreLabel?: string; lessLabel?: string }) {
  const [open, setOpen] = useState(false)
  const restRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (!open || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    restRef.current?.animate(
      [{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "translateY(0)" }],
      { duration: 180, easing: "ease-out" },
    )
  }, [open])

  return (
    <div className="max-w-prose">
      <p className="whitespace-pre-line">{head}</p>
      {rest && open ? <p ref={restRef} className="mt-2 whitespace-pre-line">{rest}</p> : null}
      {rest ? (
        <Button
          type="button"
          variant="paper"
          size="sm"
          className="mt-1 px-0 py-0 text-xs transition-colors duration-150"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? lessLabel : moreLabel}
        </Button>
      ) : null}
    </div>
  )
}
