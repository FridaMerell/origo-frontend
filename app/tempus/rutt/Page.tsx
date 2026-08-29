"use client"

import { useState } from "react"
import { Card } from "@/app/components/ui/Card"
import { Chip } from "@/app/components/ui/Chip"
import { Icon } from "@/app/components/ui/Icon"

type Stop = {
  name: string
  arrival: string
  habitat: string
  targets: string[]
  note: string
}

const stops: Stop[] = [
  {
    name: "Malmö · Bulltofta rekreationsområde",
    arrival: "07:30",
    habitat: "Ängsmark · skogsbryn",
    targets: ["Citronfjäril", "Ängsvädd"],
    note: "Morgonvärme samlar fjärilar längs de södervända brynen.",
  },
  {
    name: "Vombs fure",
    arrival: "09:10",
    habitat: "Tallskog · sandmark",
    targets: ["Större korsnäbb", "Sandödla"],
    note: "Lyssna efter korsnäbb i toppen av tallarna vid parkeringen.",
  },
  {
    name: "Fyledalen",
    arrival: "10:40",
    habitat: "Dalgång · betesmark",
    targets: ["Klockgentiana"],
    note: "Fuktängarna i dalbotten står i sen blomning.",
  },
  {
    name: "Kivik · Stenshuvud",
    arrival: "12:15",
    habitat: "Kustnära lövskog",
    targets: ["Trattkantarell"],
    note: "Avslutande stopp – mossig mark på nordsidan.",
  },
]

const summary = [
  { label: "Sträcka", value: "126 km" },
  { label: "Stopp", value: "4" },
  { label: "Sökkorridor", value: "5 km" },
  { label: "Datum", value: "30 aug 2026" },
]

export default function RuttPage() {
  const [corridor, setCorridor] = useState(5)

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-8 px-4 py-6 sm:px-8">
      <header className="flex flex-col gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[.14em] text-accent">
          Ruttplanering · exempeldata
        </span>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-text">
          Malmö → Kivik
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-text-muted">
          En planerad dagsrutt med stopp valda efter vilka arter som är aktuella längs vägen.
          Data är statisk tills Tempus ruttlager kopplas in.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((item) => (
          <Card key={item.label} className="flex flex-col gap-1 shadow-sm">
            <span className="font-mono text-[10px] uppercase tracking-wide text-text-faint">
              {item.label}
            </span>
            <strong className="font-display text-xl font-semibold">{item.value}</strong>
          </Card>
        ))}
      </section>

      <Card className="flex flex-col gap-3 shadow-sm">
        <label className="flex items-center justify-between gap-4 font-mono text-xs uppercase tracking-wide text-text-muted">
          Sökkorridor
          <output className="text-text">{corridor} km</output>
        </label>
        <input
          aria-label="Sökkorridor i kilometer"
          className="w-full accent-accent"
          max={20}
          min={1}
          onChange={(event) => setCorridor(Number(event.target.value))}
          step={1}
          type="range"
          value={corridor}
        />
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-semibold tracking-tight">Stopp längs rutten</h2>
        <ol className="flex flex-col gap-3">
          {stops.map((stop, index) => (
            <li key={stop.name}>
              <Card className="relative flex flex-col gap-3 border-l-4 border-l-accent shadow-sm sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-4">
                  <span className="font-display text-2xl text-accent">{index + 1}</span>
                  <div>
                    <h3 className="font-display text-lg font-semibold">{stop.name}</h3>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-text-faint">
                      <Icon name="map-pin" size={11} className="mr-1" />
                      {stop.habitat}
                    </p>
                    <p className="mt-2 text-sm text-text-muted">{stop.note}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {stop.targets.map((target) => (
                        <Chip
                          key={target}
                          variant="secondary"
                          className="px-2 py-0.5 text-[10px] uppercase tracking-wide"
                        >
                          {target}
                        </Chip>
                      ))}
                    </div>
                  </div>
                </div>
                <span className="shrink-0 font-mono text-sm text-text">{stop.arrival}</span>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <p className="font-mono text-[10px] text-text-faint">
        Exempeldata. Stopp och artträffar verifieras när ruttlagret och artdata kopplas in.
      </p>
    </div>
  )
}
