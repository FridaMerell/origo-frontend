import type { FluxScreen } from "@/app/lib/dal"

/** Order screens depth-first under their parents, with a depth for indentation.
 *  Screens caught in a parent cycle (or pointing at a missing parent) are never
 *  reachable from a root, so they are appended at depth 0 instead of vanishing. */
export function toScreenTree(screens: FluxScreen[]): { screen: FluxScreen; depth: number }[] {
  const ids = new Set(screens.map((screen) => screen.id))
  const byParent = new Map<number | null, FluxScreen[]>()
  for (const screen of screens) {
    const key = screen.parent !== null && ids.has(screen.parent) ? screen.parent : null
    byParent.set(key, [...(byParent.get(key) ?? []), screen])
  }

  const result: { screen: FluxScreen; depth: number }[] = []
  const seen = new Set<number>()
  const visit = (parent: number | null, depth: number) => {
    for (const screen of byParent.get(parent) ?? []) {
      if (seen.has(screen.id)) continue
      seen.add(screen.id)
      result.push({ screen, depth })
      visit(screen.id, depth + 1)
    }
  }
  visit(null, 0)

  for (const screen of screens) {
    if (seen.has(screen.id)) continue
    seen.add(screen.id)
    result.push({ screen, depth: 0 })
    visit(screen.id, 1)
  }
  return result
}
