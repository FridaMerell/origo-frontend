"use client"

import { useEffect, useMemo, useRef } from "react"
import { AppLink as Link } from "@/app/components/ui/AppLink"
import { lifespan } from "@/app/verso/historia/person-form"
import type { Person, PersonRelation } from "@/app/lib/dal"

const W = 176 // card width
const H = 60 // card height
const GX = 36 // horizontal gap
const GY = 100 // room for engraved branches between generations
const PAD = 36
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
type Path = { key: string; d: string; leaf?: { x: number; y: number; angle: number } }

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
  const bend = Math.sign(x2 - x1) * Math.min(14, Math.abs(x2 - x1) / 5)
  return `M ${x1} ${y1} C ${x1 + bend} ${mid}, ${x2 - bend} ${mid}, ${x2} ${y2}`
}

function layout(rootId: string, graph: Graph) {
  const placed: Placed[] = []
  const paths: Path[] = []
  let n = 0
  const nextKey = () => `n${n++}`

  const down = buildDown(rootId, graph, 0, new Set([rootId]))
  const unitLeft = -unitWidth(down.ids.length) / 2
  const rootCenter = unitLeft + W / 2

  function placeDown(node: DownNode, left: number, y: number, isRoot = false) {
    const center = left + node.width / 2
    const uLeft = center - unitWidth(node.ids.length) / 2
    node.ids.forEach((id, i) => {
      const x = uLeft + i * (W + GX)
      placed.push({ key: nextKey(), id, x, y, role: isRoot && i === 0 ? "root" : "kin" })
    })

    const kidsWidth = node.kids.reduce((s, k) => s + k.width, 0) + Math.max(0, node.kids.length - 1) * GX
    let cursor = left + (node.width - kidsWidth) / 2
    for (const kid of node.kids) {
      placeDown(kid, cursor, y + H + GY)
      cursor += kid.width + GX
    }
  }
  placeDown(down, -down.width / 2, 0, true)

  const up = buildUp(rootId, graph, 0, new Set([rootId]))
  function placeUp(node: UpNode, center: number, y: number, childTop?: { x: number; y: number }) {
    if (childTop) {
      placed.push({ key: nextKey(), id: node.id, x: center - W / 2, y, role: "kin" })
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

  // Draw actual relationships, never an inferred link from a whole partner unit.
  const positions = new Map<string, Placed[]>()
  for (const card of placed) {
    const copies = positions.get(card.id) ?? []
    copies.push(card)
    positions.set(card.id, copies)
  }
  for (const [parentId, children] of graph.children) {
    for (const childId of children) {
      const candidates = (positions.get(parentId) ?? []).flatMap((parent) =>
        (positions.get(childId) ?? []).map((child) => ({ parent, child })),
      )
      const pair = candidates.sort((a, b) =>
        Math.abs(a.parent.y - a.child.y) - Math.abs(b.parent.y - b.child.y) ||
        Math.abs(a.parent.x - a.child.x) - Math.abs(b.parent.x - b.child.x),
      )[0]
      if (!pair) continue
      const { parent, child } = pair
      const x1 = parent.x + W / 2
      const x2 = child.x + W / 2
      const below = child.y > parent.y
      const y1 = parent.y + (below ? H : 0)
      const y2 = child.y + (below ? 0 : H)
      paths.push({ key: nextKey(), d: elbow(x1, y1, x2, y2),
        leaf: { x: (x1 + x2) / 2, y: (y1 + y2) / 2, angle: below ? 0 : 180 } })
    }
  }
  const pairs = new Set<string>()
  for (const [id, partners] of graph.partners) {
    for (const partnerId of partners) {
      const key = [id, partnerId].sort().join(":")
      if (pairs.has(key)) continue
      pairs.add(key)
      const a = positions.get(id)?.[0]
      const b = positions.get(partnerId)?.[0]
      if (!a || !b || a.y !== b.y) continue
      const [left, right] = a.x < b.x ? [a, b] : [b, a]
      // Route additional partnerships above the row, clear of intervening cards.
      const y = left.y + H / 2
      paths.push({ key: nextKey(), d: right.x - left.x > W + GX
        ? `M ${left.x + W / 2} ${left.y} V ${left.y - 18} H ${right.x + W / 2} V ${right.y}`
        : `M ${left.x + W} ${y} Q ${left.x + W + GX / 2} ${y - 4} ${right.x} ${y}` })
    }
  }
  return { placed, paths }
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
    const graph = buildGraph(relations.filter((relation) =>
      byId.has(String(relation.person)) && byId.has(String(relation.related)),
    ))
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
      <div ref={scrollRef} className="overflow-auto rounded-lg border border-border bg-bg">
        <div className="relative" style={{ width: tree.width, height: tree.height }}>
          <svg
            width={tree.width}
            height={tree.height}
            aria-hidden
            className="pointer-events-none absolute inset-0 text-accent"
          >
            {tree.paths.map((path) => (
              <g key={path.key} transform={`translate(${tree.dx} ${tree.dy})`} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <path d={path.d} strokeWidth={4.5} opacity={0.8} />
                <path d={path.d} stroke="var(--bg)" strokeWidth={2.3} />
                <path d={path.d} strokeWidth={0.65} strokeDasharray="0.7 3.2" />
                {path.leaf && (
                  <g transform={`translate(${path.leaf.x} ${path.leaf.y}) rotate(${path.leaf.angle})`} strokeWidth={0.9}>
                    <path d="M 0 0 C -7 -8 -8 -15 -13 -22 M -7 -13 C -20 -12 -23 -22 -23 -25 C -13 -25 -8 -20 -7 -13 Z M -10 -18 L -21 -23 M 0 0 C 7 -4 12 -10 15 -17 M 8 -8 C 7 -19 15 -24 20 -25 C 23 -16 17 -9 8 -8 Z M 9 -10 L 18 -22" />
                  </g>
                )}
              </g>
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
                title={p.name}
                className={`absolute flex items-center justify-center rounded-lg border px-3 no-underline duration-200 hover:bg-accent-wash focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${
                  isRoot
                    ? "border-accent bg-accent-wash"
                    : card.role === "sibling"
                      ? "border-dashed border-text-faint bg-surface"
                      : "border-border bg-surface"
                }`}
              >
                <span className="flex min-w-0 flex-col items-center gap-1">
                  <span className="truncate text-sm font-semibold text-text">{p.name}</span>
                  <span className="truncate text-xs text-text-faint">{lifespan(p) || p.relation}</span>
                </span>
              </Link>
            )
          })}
        </div>
      </div>
      <p className="m-0 text-xs text-text-faint">
        Föräldrar ovanför, barn nedanför, partner bredvid och syskon till vänster (streckad ram).
        Klicka på en person för att flytta trädet dit.
      </p>
    </div>
  )
}
