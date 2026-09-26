"use client"

import { useEffect, useState } from "react"

export type ApiSectionIndexItem = {
  id: string
  label: string
}

export function ApiSectionIndex({ sections }: { sections: ApiSectionIndexItem[] }) {
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
    <nav aria-label="API-kartans innehåll" className="rounded-card border border-border bg-surface p-3 shadow-card">
      <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[.12em] text-text-faint">API-navigering</p>
      <ol className="flex flex-wrap gap-1 md:flex-col">
        {sections.map((section) => {
          const active = section.id === activeId
          return (
            <li key={section.id} className="shrink-0">
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
  )
}
