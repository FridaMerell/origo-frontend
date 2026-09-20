"use client"

import { useState } from "react"
import Link from "next/link"
import { createPersonRelation, deletePersonRelation } from "@/app/actions/history"
import { fieldInputClass } from "@/app/components/form/Field"
import { Button } from "@/app/components/ui/Button"
import type { Person, PersonRelation, RelationKind } from "@/app/lib/dal"

type Link = { relation: PersonRelation; other: Person }

export type Family = {
  parents: Link[]
  children: Link[]
  partners: Link[]
  siblings: Link[]
  others: Link[]
}

/** Children, grandparents etc. are derived from the stored relations, so only direct ties are kept here. */
export function familyOf(person: Person, people: Person[], relations: PersonRelation[]): Family {
  const byId = new Map(people.map((p) => [String(p.id), p]))
  const family: Family = { parents: [], children: [], partners: [], siblings: [], others: [] }

  for (const relation of relations) {
    const isPerson = String(relation.person) === String(person.id)
    const isRelated = String(relation.related) === String(person.id)
    if (!isPerson && !isRelated) continue

    const other = byId.get(String(isPerson ? relation.related : relation.person))
    if (!other) continue
    const link = { relation, other }

    if (relation.kind === "parent") (isPerson ? family.children : family.parents).push(link)
    else if (relation.kind === "spouse" || relation.kind === "partner") family.partners.push(link)
    else if (relation.kind === "sibling") family.siblings.push(link)
    else family.others.push(link)
  }
  return family
}

const GROUPS: { key: keyof Family; label: string }[] = [
  { key: "parents", label: "Föräldrar" },
  { key: "partners", label: "Partner" },
  { key: "children", label: "Barn" },
  { key: "siblings", label: "Syskon" },
  { key: "others", label: "Övrigt" },
]

/** Short one-line summary such as "Föräldrar: Anna, Per · Barn: Lisa". */
export function familySummary(family: Family): string {
  return GROUPS.filter((g) => family[g.key].length > 0)
    .map((g) => `${g.label}: ${family[g.key].map((l) => l.other.name).join(", ")}`)
    .join(" · ")
}

// How the new tie reads from the chosen person's point of view.
const CHOICES: { id: string; label: string; kind: RelationKind; otherIsParent: boolean }[] = [
  { id: "parent", label: "Har som förälder", kind: "parent", otherIsParent: true },
  { id: "child", label: "Har som barn", kind: "parent", otherIsParent: false },
  { id: "spouse", label: "Gift med", kind: "spouse", otherIsParent: false },
  { id: "partner", label: "Sambo/partner med", kind: "partner", otherIsParent: false },
  { id: "sibling", label: "Syskon till", kind: "sibling", otherIsParent: false },
  { id: "other", label: "Annan relation till", kind: "other", otherIsParent: false },
]

function years(relation: PersonRelation): string {
  if (!relation.start_year && !relation.end_year) return ""
  return `${relation.start_year ?? ""}–${relation.end_year ?? ""}`
}

/** Family ties of one person: the derived groups, delete per tie, and a form to add a tie. */
export function PersonRelations({
  person,
  people,
  relations,
  personHref,
}: {
  person: Person
  people: Person[]
  relations: PersonRelation[]
  /** When given, related people link to their own page. */
  personHref?: (id: string) => string
}) {
  const family = familyOf(person, people, relations)
  const others = people.filter((p) => String(p.id) !== String(person.id))

  const [choice, setChoice] = useState(CHOICES[0].id)
  const [otherId, setOtherId] = useState("")
  const [startYear, setStartYear] = useState("")
  const [endYear, setEndYear] = useState("")
  const [label, setLabel] = useState("")
  const [error, setError] = useState<string | undefined>()
  const [pending, setPending] = useState(false)

  async function onAdd(event: React.FormEvent) {
    event.preventDefault()
    const picked = CHOICES.find((c) => c.id === choice) ?? CHOICES[0]
    if (picked.kind === "other" && !label.trim()) {
      setError("Beskriv relationen.")
      return
    }
    setPending(true)
    const result = await createPersonRelation({
      person: picked.otherIsParent ? otherId : String(person.id),
      related: picked.otherIsParent ? String(person.id) : otherId,
      kind: picked.kind,
      start_year: startYear,
      end_year: endYear,
      label: label.trim(),
    })
    setPending(false)
    if (result?.error) {
      setError(result.error)
      return
    }
    setError(undefined)
    setOtherId("")
    setStartYear("")
    setEndYear("")
    setLabel("")
  }

  async function onRemove(id: string) {
    const result = await deletePersonRelation(id)
    if (result?.error) setError(result.error)
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
      {GROUPS.some((g) => family[g.key].length > 0) ? (
        <dl className="m-0 flex flex-col gap-2">
          {GROUPS.filter((g) => family[g.key].length > 0).map((g) => (
            <div key={g.key} className="flex flex-col gap-1">
              <dt className="text-xs font-semibold text-text-faint">{g.label}</dt>
              <dd className="m-0 flex flex-wrap gap-2">
                {family[g.key].map(({ relation, other }) => (
                  <span
                    key={relation.id}
                    className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-text"
                  >
                    {personHref ? (
                      <Link href={personHref(other.id)} className="text-text no-underline hover:text-accent">
                        {other.name}
                      </Link>
                    ) : (
                      other.name
                    )}
                    {relation.label && <span className="text-text-muted">({relation.label})</span>}
                    {years(relation) && <span className="text-text-faint">{years(relation)}</span>}
                    <button
                      type="button"
                      onClick={() => onRemove(relation.id)}
                      aria-label={`Ta bort relationen till ${other.name}`}
                      className="text-text-faint hover:text-danger"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="m-0 text-xs text-text-faint">Inga släktband ännu.</p>
      )}

      {others.length > 0 ? (
        <form onSubmit={onAdd} className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <select className={fieldInputClass} value={choice} onChange={(e) => setChoice(e.target.value)}>
              {CHOICES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <select className={fieldInputClass} value={otherId} onChange={(e) => setOtherId(e.target.value)}>
              <option value="">Välj person</option>
              {others.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              inputMode="numeric"
              placeholder="Från år (valfritt)"
              className={fieldInputClass}
              value={startYear}
              onChange={(e) => setStartYear(e.target.value)}
            />
            <input
              type="text"
              inputMode="numeric"
              placeholder="Till år (valfritt)"
              className={fieldInputClass}
              value={endYear}
              onChange={(e) => setEndYear(e.target.value)}
            />
          </div>
          <input
            type="text"
            placeholder={
              choice === "other"
                ? "Beskriv relationen, t.ex. granne eller fosterbarn"
                : "Exakt benämning (valfritt), t.ex. adoptivson"
            }
            className={fieldInputClass}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          {error && <p role="alert" className="m-0 text-xs text-danger">{error}</p>}
          <div className="flex justify-end">
            <Button type="submit" variant="secondary" size="sm" disabled={pending || !otherId}>
              {pending ? "Lägger till..." : "Lägg till släktband"}
            </Button>
          </div>
        </form>
      ) : (
        <p className="m-0 text-xs text-text-faint">Lägg till fler personer för att kunna koppla ihop dem.</p>
      )}
    </div>
  )
}
