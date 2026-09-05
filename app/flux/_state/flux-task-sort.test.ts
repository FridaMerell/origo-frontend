import { describe, expect, it } from "vitest"
import { sortFluxTasks } from "./flux-task-sort"
import type { FluxTask } from "@/app/lib/dal"

function makeTask(overrides: Partial<FluxTask> & { id: number }): FluxTask {
  return {
    project: 1,
    milestone: null,
    parent: null,
    requirements: [],
    assignees: [],
    title: `Task ${overrides.id}`,
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
    ...overrides,
  }
}

describe("sortFluxTasks", () => {
  it("orders tasks by soonest deadline first", () => {
    const tasks = [
      makeTask({ id: 1, due_date: "2024-06-01" }),
      makeTask({ id: 2, due_date: "2024-01-15" }),
      makeTask({ id: 3, due_date: "2024-03-10" }),
    ]

    expect(sortFluxTasks(tasks).map((t) => t.id)).toEqual([2, 3, 1])
  })

  it("sorts tasks without a deadline after tasks with one", () => {
    const tasks = [
      makeTask({ id: 1, due_date: null }),
      makeTask({ id: 2, due_date: "2024-01-15" }),
    ]

    expect(sortFluxTasks(tasks).map((t) => t.id)).toEqual([2, 1])
  })

  it("falls back to creation date when deadlines tie", () => {
    const tasks = [
      makeTask({ id: 1, due_date: "2024-06-01", created_at: "2024-01-05T00:00:00Z" }),
      makeTask({ id: 2, due_date: "2024-06-01", created_at: "2024-01-01T00:00:00Z" }),
    ]

    expect(sortFluxTasks(tasks).map((t) => t.id)).toEqual([2, 1])
  })

  it("falls back to creation date when neither task has a deadline", () => {
    const tasks = [
      makeTask({ id: 1, due_date: null, created_at: "2024-02-01T00:00:00Z" }),
      makeTask({ id: 2, due_date: null, created_at: "2024-01-01T00:00:00Z" }),
    ]

    expect(sortFluxTasks(tasks).map((t) => t.id)).toEqual([2, 1])
  })

  it("does not mutate the input array", () => {
    const tasks = [
      makeTask({ id: 1, due_date: "2024-06-01" }),
      makeTask({ id: 2, due_date: "2024-01-15" }),
    ]
    const original = [...tasks]

    sortFluxTasks(tasks)

    expect(tasks).toEqual(original)
  })
})
