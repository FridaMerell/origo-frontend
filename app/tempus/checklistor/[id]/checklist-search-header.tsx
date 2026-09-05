"use client"

import { useEffect, useRef, useState } from "react"

export function ChecklistSearchHeader({
  initialQuery,
  onSearch,
}: {
  initialQuery: string
  onSearch: (query: string) => void
}) {
  const [query, setQuery] = useState(initialQuery)
  const [searchOpen, setSearchOpen] = useState(Boolean(initialQuery))
  const [doubleSearchColumn, setDoubleSearchColumn] = useState<string | null>(
    initialQuery ? "Vänster spalt" : null,
  )
  const appliedQuery = useRef(initialQuery)

  useEffect(() => {
    const normalizedQuery = query.trim()
    if (normalizedQuery === appliedQuery.current) return

    const timer = setTimeout(() => {
      appliedQuery.current = normalizedQuery
      onSearch(normalizedQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, onSearch])

  return (
    <>
      <div className="single-header grid grid-cols-[2.25rem_minmax(0,1fr)_3.25rem] border-l border-t border-border font-display text-[10px] leading-tight text-text-muted sm:grid-cols-[2.75rem_minmax(12rem,1.75fr)_7rem_3.5rem_minmax(8rem,1fr)]">
        <span className="row-span-2 flex items-center justify-center border-b border-r border-border px-1 py-1.5 text-center text-[11px] italic">Löp.<br />nr</span>
        <div className="row-span-2 flex items-center border-b border-r border-border px-3 py-1.5 text-center italic">
          {searchOpen ? (
            <label className="flex w-full items-center gap-2 text-left">
              <span className="sr-only">Sök i checklistan</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Namn eller taxonnummer"
                ref={(element) => {
                  if (element?.offsetParent) element.focus()
                }}
                className="min-w-0 flex-1 border-0 border-b border-accent bg-transparent px-0 font-body text-xs not-italic text-text placeholder:text-text-faint focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  setQuery("")
                  setSearchOpen(false)
                }}
                className="shrink-0 font-body text-[10px] not-italic text-text-muted hover:text-text"
              >
                Stäng
              </button>
            </label>
          ) : (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="w-full text-center italic hover:text-text"
            >
              Artens namn och benämning
            </button>
          )}
        </div>
        <span className="hidden items-center justify-center border-b border-r border-border px-2 py-1.5 text-center text-[11px] italic sm:row-span-2 sm:flex">Dyntaxa<br />taxon-nr</span>
        <span className="col-start-3 flex items-center justify-center border-b border-r border-border px-1 py-1.5 text-center italic sm:col-start-4 sm:row-span-1">Fält</span>
        <span className="hidden items-center justify-center border-b border-r border-border px-2 py-2 text-center italic sm:row-span-2 sm:flex">Särskilda<br />anmärkningar</span>
        <span className="col-start-3 row-start-2 flex items-center justify-center border-b border-r border-border px-1 py-1 text-center text-[8px] sm:col-start-4">Avpr.</span>
      </div>

      <div className="double-header hidden grid-cols-2 border-l border-t border-border font-display text-[9px] italic leading-tight text-text-muted">
        {["Vänster spalt", "Höger spalt"].map((label) => (
          <div key={label} className="grid grid-cols-[2rem_2.5rem_minmax(0,1fr)] border-b border-border last:border-l">
            <span className="flex items-center justify-center border-r border-border px-1 py-1.5">Nr</span>
            <span className="flex items-center justify-center border-r border-border px-1 py-1.5">Avpr.</span>
            {searchOpen && doubleSearchColumn === label ? (
              <label className="flex min-w-0 items-center gap-2 px-3 py-1.5 not-italic">
                <span className="sr-only">Sök i checklistan</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Namn eller taxonnummer"
                  ref={(element) => {
                    if (element?.offsetParent) element.focus()
                  }}
                  className="min-w-0 flex-1 border-0 border-b border-accent bg-transparent px-0 font-body text-[10px] text-text placeholder:text-text-faint focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setQuery("")
                    setSearchOpen(false)
                    setDoubleSearchColumn(null)
                  }}
                  className="shrink-0 font-body text-[9px] text-text-muted hover:text-text"
                >
                  Stäng
                </button>
              </label>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(true)
                  setDoubleSearchColumn(label)
                }}
                className="px-3 py-1.5 text-left italic hover:text-text"
              >
                Artens namn
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
