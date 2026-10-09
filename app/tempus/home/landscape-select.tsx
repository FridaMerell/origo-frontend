"use client"

import { ChevronDown } from "lucide-react"
import { useDismissableOpen } from "@/app/components/ui/use-dismissable-open"
import { useOverview } from "./overview-provider"
import { LABEL } from "./styles"

// Multiselect for the landscape types shown in the per-landscape reading.
// Nothing chosen means every type.
export function LandscapeSelect({ options }: { options: string[] }) {
  const { selection, select } = useOverview()
  const { open, setOpen, ref } = useDismissableOpen<HTMLDivElement>()
  const chosen = options.filter((name) => selection.landscapes.includes(name))
  const label = chosen.length === 0 ? "Alla miljöer" : chosen.length <= 2 ? chosen.join(", ") : `${chosen.length} miljöer`
  const toggle = (name: string) =>
    select({ landscapes: chosen.includes(name) ? chosen.filter((item) => item !== name) : [...chosen, name] })

  return (
    <div ref={ref} className="relative ml-auto">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`flex items-center gap-1.5 text-text-muted transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${LABEL}`}
      >
        <span>{label}</span>
        <ChevronDown size={12} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <fieldset
          aria-label="Välj miljöer"
          className="absolute right-0 top-full z-30 mt-1 min-w-56 border border-border bg-surface p-1 shadow-lg transition-[opacity,translate] duration-150 ease-(--ease-standard) starting:-translate-y-1 starting:opacity-0 motion-reduce:transition-none"
        >
          {options.map((name) => (
            <label
              key={name}
              className="relative flex min-h-9 cursor-pointer items-center gap-2.5 px-2.5 text-sm text-text-muted transition-colors hover:bg-accent-wash hover:text-text has-checked:text-text has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-focus-ring"
            >
              <input
                type="checkbox"
                checked={chosen.includes(name)}
                onChange={() => toggle(name)}
                className="peer absolute inset-0 cursor-pointer opacity-0"
              />
              <span aria-hidden="true" className="size-2.5 border border-text-muted peer-checked:border-text peer-checked:bg-text" />
              {name}
            </label>
          ))}
          {chosen.length > 0 ? (
            <button
              type="button"
              onClick={() => select({ landscapes: [] })}
              className="mt-1 block w-full border-t border-border px-2.5 pb-1.5 pt-2.5 text-left font-mono text-[10px] uppercase tracking-[.14em] text-link hover:underline"
            >
              Rensa
            </button>
          ) : null}
        </fieldset>
      ) : null}
    </div>
  )
}
