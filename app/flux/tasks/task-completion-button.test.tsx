import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { TaskCompletionButton } from "./task-completion-button"
import { FluxDataProvider, useFluxTasks } from "@/app/flux/_state/flux-context"
import { toggleTaskStatus, type FluxActionState } from "@/app/actions/flux"
import type { FluxTask } from "@/app/lib/dal"

vi.mock("@/app/actions/flux", () => ({
  toggleTaskStatus: vi.fn(),
}))

function makeTask(overrides: Partial<FluxTask> & { id: number }): FluxTask {
  return {
    project: 1,
    milestone: null,
    parent: null,
    requirements: [],
    assignees: [],
    title: "Task",
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

function TaskUnderTest({ task }: { task: FluxTask }) {
  const tasks = useFluxTasks()
  const current = tasks.find((t) => t.id === task.id) ?? task
  return <TaskCompletionButton id={current.id} status={current.status} />
}

function renderTask(task: FluxTask) {
  return render(
    <FluxDataProvider
      projects={[]}
      selectedProject={null}
      tasks={[task]}
      milestones={[]}
      updates={[]}
      documents={[]}
      users={[]}
    >
      <TaskUnderTest task={task} />
    </FluxDataProvider>,
  )
}

describe("TaskCompletionButton optimistic status update", () => {
  it("updates immediately, before the server call resolves", async () => {
    let resolveAction: (value: FluxActionState) => void = () => {}
    vi.mocked(toggleTaskStatus).mockReturnValue(
      new Promise((resolve) => { resolveAction = resolve }),
    )
    const user = userEvent.setup()

    renderTask(makeTask({ id: 1, status: "not_started" }))
    await user.click(screen.getByRole("button"))

    expect(screen.getByRole("button", { name: "Markera som klar" })).toBeTruthy()

    await act(async () => {
      resolveAction({ success: true })
    })
  })

  it("rolls back to the previous status when the server call fails", async () => {
    vi.mocked(toggleTaskStatus).mockResolvedValue({ error: "Kunde inte spara." })
    const user = userEvent.setup()

    renderTask(makeTask({ id: 1, status: "not_started" }))
    await user.click(screen.getByRole("button"))

    await screen.findByRole("button", { name: "Markera som påbörjad" })
  })

  it("rolls back when the server call throws", async () => {
    vi.mocked(toggleTaskStatus).mockRejectedValue(new Error("network down"))
    const user = userEvent.setup()

    renderTask(makeTask({ id: 1, status: "not_started" }))
    await user.click(screen.getByRole("button"))

    await screen.findByRole("button", { name: "Markera som påbörjad" })
  })

  it("keeps the new status when the server call succeeds", async () => {
    vi.mocked(toggleTaskStatus).mockResolvedValue({ success: true })
    const user = userEvent.setup()

    renderTask(makeTask({ id: 1, status: "not_started" }))
    await user.click(screen.getByRole("button"))

    await screen.findByRole("button", { name: "Markera som klar" })
  })
})
