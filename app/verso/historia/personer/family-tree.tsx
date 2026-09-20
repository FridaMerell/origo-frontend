"use client"

import { useEffect, useMemo, useRef } from "react"
import { AppLink as Link } from "@/app/components/ui/AppLink"
import { lifespan } from "@/app/verso/historia/person-form"
import type { Person, PersonRelation } from "@/app/lib/dal"

const W = 176 // card width
const H = 60 // card height
const GX = 20 // horizontal gap
const GY = 52 // vertical gap between generations
const PAD = 24
const MAX_UP = 3
const MAX_DOWN = 3

type Graph = {
  parents: Map<string, string[]>
  children: Map<string, string[]>
  partners: Map<string, string[]>
  siblings: Map<string, string[]>
}

function add(map: Map<string, string[]>, key: string, value: string) {
  const list = map.get(key) ?? []
  if (!list.includes(value)) list.push(value)
  map.set(key, list)
}

function buildGraph(relations: PersonRelation[]): Graph {
  const graph: Graph = { parents: new Map(), children: new Map(), partners: new Map(), siblings: new Map() }
  for (const r of relations) {
    const a = String(r.person)
    const b = String(r.related)
    if (r.kind === "parent") {
      // `person` is the parent of `related`.
      add(graph.children, a, b)
      add(graph.parents, b, a)
    } else if (r.kind === "spouse" || r.kind === "partner") {
      add(graph.partners, a, b)
      add(graph.partners, b, a)
    } else if (r.kind === "sibling") {
      add(graph.siblings, a, b)
      add(graph.siblings, b, a)
    }
  }
  return graph
}

type Placed = { key: string; id: string; x: number; y: number; role: "root" | "kin" | "sibling" }
type Path = { key: string; d: string }

// A partner unit (a person plus partners) with its descendants, laid out top-down.
type DownNode = { ids: string[]; kids: DownNode[]; width: number }

function unitWidth(count: number) {
  return count * W + (count - 1) * GX
}

function buildDown(id: string, graph: Graph, depth: number, seen: Set<string>): DownNode {
  seen.add(id)
  const partners = (graph.partners.get(id) ?? []).filter((p) => !seen.has(p))
  partners.forEach((p) => seen.add(p))
  const ids = [id, ...partners]

  let kids: DownNode[] = []
  if (depth < MAX_DOWN) {
    const childIds = [...new Set(ids.flatMap((p) => graph.children.get(p) ?? []))].filter((c) => !seen.has(c))
    kids = childIds.map((c) => buildDown(c, graph, depth + 1, seen))
  }
  const kidsWidth = kids.reduce((sum, k) => sum + k.width, 0) + Math.max(0, kids.length - 1) * GX
  return { ids, kids, width: Math.max(unitWidth(ids.length), kidsWidth) }
}

// A person with their parents above, laid out bottom-up.
type UpNode = { id: string; parents: UpNode[]; width: number }

function buildUp(id: string, graph: Graph, depth: number, seen: Set<string>): UpNode {
  seen.add(id)
  const parentIds = depth < MAX_UP ? (graph.parents.get(id) ?? []).filter((p) => !seen.has(p)) : []
  const parents = parentIds.map((p) => buildUp(p, graph, depth + 1, seen))
  const parentsWidth = parents.reduce((sum, p) => sum + p.width, 0) + Math.max(0, parents.length - 1) * GX
  return { id, parents, width: Math.max(W, parentsWidth) }
}

function elbow(x1: number, y1: number, x2: number, y2: number): string {
  const mid = (y1 + y2) / 2
  return `M ${x1} ${y1} V ${mid} H ${x2} V ${y2}`
}

function layout(rootId: string, graph: Graph) {
  const placed: Placed[] = []
  const paths: Path[] = []
  let n = 0
  const nextKey = () => `n${n++}`

  const down = buildDown(rootId, graph, 0, new Set([rootId]))
  const unitLeft = -unitWidth(down.ids.length) / 2
  const rootCenter = unitLeft + W / 2

  function placeDown(node: DownNode, left: number, y: number, anchor?: { x: number; y: number }, isRoot = false) {
    const center = left + node.width / 2
    const uLeft = center - unitWidth(node.ids.length) / 2
    node.ids.forEach((id, i) => {
      const x = uLeft + i * (W + GX)
      placed.push({ key: nextKey(), id, x, y, role: isRoot && i === 0 ? "root" : "kin" })
      if (i > 0) paths.push({ key: nextKey(), d: `M ${x - GX} ${y + H / 2} H ${x}` })
    })
    if (anchor) paths.push({ key: nextKey(), d: elbow(anchor.x, anchor.y, center, y) })

    const kidsWidth = node.kids.reduce((s, k) => s + k.width, 0) + Math.max(0, node.kids.length - 1) * GX
    let cursor = left + (node.width - kidsWidth) / 2
    for (const kid of node.kids) {
      placeDown(kid, cursor, y + H + GY, { x: center, y: y + H })
      cursor += kid.width + GX
    }
  }
  placeDown(down, -down.width / 2, 0, undefined, true)

  const up = buildUp(rootId, graph, 0, new Set([rootId]))
  function placeUp(node: UpNode, center: number, y: number, childTop?: { x: number; y: number }) {
    if (childTop) {
      placed.push({ key: nextKey(), id: node.id, x: center - W / 2, y, role: "kin" })
      paths.push({ key: nextKey(), d: elbow(childTop.x, childTop.y, center, y + H) })
    }
    const parentsWidth = node.parents.reduce((s, p) => s + p.width, 0) + Math.max(0, node.parents.length - 1) * GX
    let cursor = center - parentsWidth / 2
    for (const parent of node.parents) {
      placeUp(parent, cursor + parent.width / 2, y - H - GY, { x: center, y })
      cursor += parent.width + GX
    }
  }
  placeUp(up, rootCenter, 0)

  // Siblings sit to the left of the root, in the same row.
  const siblings = (graph.siblings.get(rootId) ?? []).filter((id) => id !== rootId)
  siblings.forEach((id, i) => {
    placed.push({ key: nextKey(), id, x: unitLeft - (i + 1) * (W + GX), y: 0, role: "sibling" })
  })

  return { placed, paths }
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

/** Family tree around one person: parents above, children below, partners and siblings beside. */
export function FamilyTree({
  person,
  people,
  relations,
  personHref,
}: {
  person: Person
  people: Person[]
  relations: PersonRelation[]
  personHref: (id: string) => string
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const rootId = String(person.id)
  const byId = useMemo(() => new Map(people.map((p) => [String(p.id), p])), [people])

  const tree = useMemo(() => {
    const graph = buildGraph(relations)
    const { placed, paths } = layout(rootId, graph)
    const visible = placed.filter((p) => byId.has(p.id))
    if (visible.length === 0) return null

    const minX = Math.min(...visible.map((p) => p.x)) - PAD
    const maxX = Math.max(...visible.map((p) => p.x + W)) + PAD
    const minY = Math.min(...visible.map((p) => p.y)) - PAD
    const maxY = Math.max(...visible.map((p) => p.y + H)) + PAD
    const root = visible.find((p) => p.role === "root")
    return {
      width: maxX - minX,
      height: maxY - minY,
      dx: -minX,
      dy: -minY,
      cards: visible,
      paths,
      rootCenter: (root?.x ?? 0) + W / 2 - minX,
      hasKin: visible.length > 1,
    }
  }, [relations, rootId, byId])

  // Start with the selected person in view, since the tree can be wider than the panel.
  useEffect(() => {
    const el = scrollRef.current
    if (el && tree) el.scrollLeft = tree.rootCenter - el.clientWidth / 2
  }, [tree, rootId])

  if (!tree || !tree.hasKin) {
    return (
      <p className="m-0 text-sm text-text-muted">
        Inga släktband ännu. Lägg till dem under fliken Släkt så byggs trädet här.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div ref={scrollRef} className="overflow-auto rounded-lg border border-border bg-surface-2">
        <div className="relative" style={{ width: tree.width, height: tree.height }}>
          <svg
            width={tree.width}
            height={tree.height}
            aria-hidden
            className="pointer-events-none absolute inset-0 text-text-faint"
          >
            {tree.paths.map((path) => (
              <path
                key={path.key}
                d={path.d}
                transform={`translate(${tree.dx} ${tree.dy})`}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinejoin="round"
              />
            ))}
          </svg>
          {tree.cards.map((card) => {
            const p = byId.get(card.id)!
            const isRoot = card.role === "root"
            return (
              <Link
                key={card.key}
                href={personHref(p.id)}
                aria-current={isRoot ? "true" : undefined}
                style={{ left: card.x + tree.dx, top: card.y + tree.dy, width: W, height: H }}
                className={`absolute flex items-center gap-2 rounded-lg border bg-surface px-2.5 no-underline duration-200 hover:bg-surface-2 ${
                  isRoot
                    ? "border-text shadow-card"
                    : card.role === "sibling"
                      ? "border-dashed border-text-faint"
                      : "border-border"
                }`}
              >
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-xs font-semibold text-text-muted"
                >
                  {initials(p.name)}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold text-text">{p.name}</span>
                  <span className="truncate text-xs text-text-faint">{lifespan(p) || p.relation}</span>
                </span>
              </Link>
            )
          })}
        </div>
      </div>
      <p className="m-0 text-xs text-text-faint">
        Föräldrar ovanför, barn nedanför, partner bredvid (heldragen linje) och syskon till vänster (streckad ram).
        Klicka på en person för att flytta trädet dit.
      </p>
    </div>
  )
}
