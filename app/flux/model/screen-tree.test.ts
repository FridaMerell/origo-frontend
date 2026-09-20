import { describe, expect, it } from "vitest"
import type { FluxScreen } from "@/app/lib/dal"
import { toScreenTree } from "./screen-tree"

const screen = (id: number, parent: number | null): FluxScreen => ({
  id, project: 1, name: `S${id}`, route: `/s${id}`, description: "", entities: [], parent,
})

describe("toScreenTree", () => {
  it("orders children depth-first under their parent", () => {
    const tree = toScreenTree([screen(1, null), screen(2, 1), screen(3, null), screen(4, 2)])
    expect(tree.map((node) => [node.screen.id, node.depth])).toEqual([[1, 0], [2, 1], [4, 2], [3, 0]])
  })

  it("treats a missing parent as a root", () => {
    const tree = toScreenTree([screen(1, 99)])
    expect(tree).toEqual([{ screen: screen(1, 99), depth: 0 }])
  })

  it("keeps screens in a parent cycle visible, each exactly once", () => {
    const tree = toScreenTree([screen(1, 2), screen(2, 1), screen(3, null)])
    expect(tree.map((node) => node.screen.id).sort()).toEqual([1, 2, 3])
  })
})
