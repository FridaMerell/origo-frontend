import { describe, expect, it } from "vitest"
import { mergeProjectBoards } from "./merge-project-boards"
import type { FluxBoard, FluxProject, FluxTask, FluxUser } from "@/app/lib/dal"

function makeProject(id: number): FluxProject {
  return { id, name: `Projekt ${id}`, description: "", members: [], files: [], created_at: "", updated_at: "" }
}

function makeTask(id: number, project: number): FluxTask {
  return {
    id,
    project,
    milestone: null,
    parent: null,
    requirements: [],
    assignees: [],
    title: `Task ${id}`,
    description: "",
    due_date: null,
    recurrence: "none",
    recurrence_interval: 1,
    recurrence_end_date: null,
    priority: "medium",
    status: "not_started",
    files: [],
    subtasks: [],
    required_by: [],
    recurrence_source: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    update_count: 0,
  }
}

function makeUser(id: number): FluxUser {
  return { id, username: `user${id}` }
}

function makeBoard(project: FluxProject, overrides: Partial<FluxBoard> = {}): FluxBoard {
  return {
    project,
    projects: [project],
    milestones: [],
    tasks: [],
    updates: [],
    documents: [],
    users: [],
    ...overrides,
  }
}

describe("mergeProjectBoards", () => {
  it("concatenates tasks from every project's board", () => {
    const projectA = makeProject(1)
    const projectB = makeProject(2)
    const boards = [
      makeBoard(projectA, { tasks: [makeTask(1, 1), makeTask(2, 1)] }),
      makeBoard(projectB, { tasks: [makeTask(3, 2)] }),
    ]

    const merged = mergeProjectBoards(boards, undefined)

    expect(merged.tasks.map((t) => t.id)).toEqual([1, 2, 3])
  })

  it("skips boards that failed to load", () => {
    const projectA = makeProject(1)
    const boards: (FluxBoard | null)[] = [makeBoard(projectA, { tasks: [makeTask(1, 1)] }), null]

    const merged = mergeProjectBoards(boards, undefined)

    expect(merged.tasks.map((t) => t.id)).toEqual([1])
  })

  it("deduplicates users that are members of more than one project", () => {
    const projectA = makeProject(1)
    const projectB = makeProject(2)
    const shared = makeUser(1)
    const boards = [
      makeBoard(projectA, { users: [shared, makeUser(2)] }),
      makeBoard(projectB, { users: [shared, makeUser(3)] }),
    ]

    const merged = mergeProjectBoards(boards, undefined)

    expect(merged.users.map((u) => u.id).sort()).toEqual([1, 2, 3])
  })

  it("picks the project matching the selected-project cookie", () => {
    const projectA = makeProject(1)
    const projectB = makeProject(2)
    const boards = [makeBoard(projectA), makeBoard(projectB)]

    const merged = mergeProjectBoards(boards, "2")

    expect(merged.selectedProject?.id).toBe(2)
  })

  it("falls back to the first project when no cookie matches", () => {
    const projectA = makeProject(1)
    const projectB = makeProject(2)
    const boards = [makeBoard(projectA), makeBoard(projectB)]

    const merged = mergeProjectBoards(boards, "does-not-exist")

    expect(merged.selectedProject?.id).toBe(1)
  })

  it("returns no selected project when there are no boards", () => {
    const merged = mergeProjectBoards([], undefined)

    expect(merged.selectedProject).toBeNull()
    expect(merged.tasks).toEqual([])
  })
})
