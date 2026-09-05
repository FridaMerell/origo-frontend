import { useEffect, useRef, useState } from "react"
import { Icon } from "@/app/components/ui/Icon"
import { useTempusGeoAreas } from "@/app/tempus/_state/tempus-context"

export function GeoAreaSelector({ compact = false }: { compact?: boolean }) {
  const { geoAreas, selectedGeoArea, selectGeoArea } = useTempusGeoAreas()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const allSweden = selectedGeoArea === null

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  return (
    <div ref={ref} className={`relative ${compact ? "w-full" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={`Välj område: ${selectedGeoArea?.name ?? "Hela Sverige"}`}
        className={`flex items-center gap-1.5 rounded-md text-sm text-text-muted transition-colors hover:bg-accent-wash hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${compact ? "h-14 w-full justify-between border border-border bg-surface-raised px-3" : "max-w-44 px-2.5 py-2"}`}
      >
        {compact ? (
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-wash text-accent">
              <Icon name="map-pin" size={15} />
            </span>
            <span className="flex min-w-0 flex-col items-start">
              <span className="font-mono text-[10px] uppercase tracking-wide text-text-faint">Område</span>
              <span className="max-w-full truncate font-medium text-text">
                {selectedGeoArea?.name ?? "Hela Sverige"}
              </span>
            </span>
          </span>
        ) : (
          <span className="truncate">{selectedGeoArea?.name ?? "Hela Sverige"}</span>
        )}
        <Icon
          name="chevron-down"
          size={14}
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className={`absolute z-50 min-w-52 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-md ${compact ? "inset-x-0 bottom-full mb-1" : "right-0 top-full mt-1"}`}>
          <button
            type="button"
            aria-pressed={allSweden}
            onClick={() => {
              setOpen(false)
              if (!allSweden) selectGeoArea(null)
            }}
            className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent-wash ${allSweden ? "font-semibold text-accent" : "text-text"}`}
          >
            Hela Sverige
            {allSweden ? <Icon name="check" size={16} /> : null}
          </button>
          {geoAreas.length > 0 ? <div className="my-1 border-t border-border" /> : null}
          {geoAreas.map((geoArea) => (
            <button
              key={geoArea.id}
              type="button"
              onClick={() => {
                setOpen(false)
                if (geoArea.id !== selectedGeoArea?.id) selectGeoArea(geoArea.id)
              }}
              className={`flex w-full items-center justify-between gap-3 whitespace-nowrap px-3 py-2 text-left text-sm hover:bg-accent-wash hover:text-accent ${geoArea.id === selectedGeoArea?.id ? "font-semibold text-accent" : "text-text-muted"
                }`}
            >
              {geoArea.name}
              {geoArea.id === selectedGeoArea?.id ? <Icon name="check" size={16} /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
