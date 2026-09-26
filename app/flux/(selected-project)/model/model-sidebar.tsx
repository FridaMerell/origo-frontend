"use client"

import { useEffect, useState } from "react"
import { ModelLaunchControls } from "./model-launch-controls"

export type ModelIndexItem = {
  id: string
  label: string
}

export function ModelSidebar({
  compact = false,
  projectId,
  sections,
  entityCount,
  completeCrudCount,
  providerCount,
  screenCount,
  stackTargetCount,
  scaffoldTarget,
}: {
  compact?: boolean
  projectId: string
  sections: ModelIndexItem[]
  entityCount: number
  completeCrudCount: number
  providerCount: number
  screenCount: number
  stackTargetCount: number
  scaffoldTarget: string
}) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "")

  useEffect(() => {
    let frame = 0
    const updateActiveSection = () => {
      frame = 0
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
        setActiveId(sections[sections.length - 1]?.id ?? "")
        return
      }

      const marker = window.innerHeight * 0.28
      let next = sections[0]?.id ?? ""

      for (const section of sections) {
        const element = document.getElementById(section.id)
        if (!element) continue
        if (element.getBoundingClientRect().top <= marker) next = section.id
        else break
      }

      setActiveId(next)
    }

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateActiveSection)
    }

    updateActiveSection()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    window.addEventListener("hashchange", updateActiveSection)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      window.removeEventListener("hashchange", updateActiveSection)
    }
  }, [sections])

  return (
    <section className="rounded-card border border-border bg-surface p-3 shadow-card">
      <nav aria-label="Modellens innehåll">
        <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[.12em] text-text-faint">Modellnavigering</p>
        <ol className={compact ? "flex flex-wrap gap-1" : "flex flex-col gap-1"}>
          {sections.map((section) => {
            const active = section.id === activeId
            return (
              <li key={section.id}>
                <a
                  href={"#" + section.id}
                  aria-current={active ? "location" : undefined}
                  className={active
                    ? "block rounded-xl bg-surface-2 px-3 py-2 text-sm font-semibold text-text no-underline"
                    : "block rounded-xl px-3 py-2 text-sm font-medium text-text-muted no-underline hover:bg-surface-2 hover:text-text"}
                >
                  {section.label}
                </a>
              </li>
            )
          })}
        </ol>
      </nav>

      <section className="mt-4 border-t border-border px-3 pt-4">
        <p className="text-xs font-semibold uppercase tracking-[.12em] text-text-faint">Projektstatus</p>
        <dl className="mt-3 space-y-2.5 text-sm">
          <div className="flex items-baseline justify-between gap-3"><dt className="text-text-muted">Domän</dt><dd className="font-mono text-text">{entityCount} Entities</dd></div>
          <div className="flex items-baseline justify-between gap-3"><dt className="text-text-muted">CRUD</dt><dd className="font-mono text-text">{completeCrudCount} / {entityCount}</dd></div>
          <div className="flex items-baseline justify-between gap-3"><dt className="text-text-muted">Klient</dt><dd className="font-mono text-text">{screenCount} / {providerCount}</dd></div>
          <div className="flex items-baseline justify-between gap-3"><dt className="text-text-muted">Stack</dt><dd className="font-mono text-text">{stackTargetCount} targets</dd></div>
        </dl>
      </section>

      {compact && (
        <div className="mt-3 border-t border-border px-3 pt-3">
          <ModelLaunchControls projectId={projectId} entityCount={entityCount} scaffoldTarget={scaffoldTarget} />
        </div>
      )}
    </section>
  )
}
