import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { FluxDataProvider, useFluxTasks, useSelectedFluxProject } from "./flux-context"
import { FLUX_PROJECT_COOKIE } from "@/app/lib/config"
import type { FluxBoard, FluxProject, FluxTask } from "@/app/lib/dal"

const mocks = vi.hoisted(() => ({
  pathname: "/",
  pushState: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
}))

function makeProject(id: number, name: string): FluxProject {
  return { id, name, description: "", members: [], files: [], created_at: "", updated_at: "" }
}

function makeTask(id: number, project: number): FluxTask {
  return { id, project, milestone: null, parent: null, requirements: [], assignees: [], title: `Uppgift ${id}`, description: "", due_date: null, recurrence: "none", recurrence_interval: 1, recurrence_end_date: null, priority: "medium", status: "not_started", files: [], subtasks: [], required_by: [], recurrence_source: null, created_at: "", updated_at: "", update_count: 0 }
}

function wrapper({ children }: { children: React.ReactNode }) {
  const projectA = makeProject(1, "Projekt A")
  const projectB = makeProject(2, "Projekt B")
  return (
    <FluxDataProvider
      projects={[projectA, projectB]}
      selectedProject={projectA}
      tasks={[]}
      milestones={[]}
      updates={[]}
      documents={[]}
      users={[]}
    >
      {children}
    </FluxDataProvider>
  )
}

describe("useSelectedFluxProject", () => {
  beforeEach(() => {
    mocks.pathname = "/"
    mocks.pushState.mockClear()
    document.cookie = `${FLUX_PROJECT_COOKIE}=; path=/; max-age=0`
    Object.defineProperty(window, "location", {
      configurable: true,
      value: window.location,
    })
    Object.defineProperty(window.history, "pushState", {
      configurable: true,
      value: mocks.pushState,
    })
  })

  it("writes the chosen project id before fetching the selected board", async () => {
    const project = makeProject(2, "Projekt B")
    const board: FluxBoard = {
      project,
      projects: [project],
      tasks: [],
      milestones: [],
      updates: [],
      documents: [],
      users: [],
    }
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => board }))
    const { result } = renderHook(() => useSelectedFluxProject(), { wrapper })

    await act(async () => {
      await result.current.selectProject("2")
    })

    expect(document.cookie).toContain(`${FLUX_PROJECT_COOKIE}=2`)
    expect(fetch).toHaveBeenCalledWith(
      new URL("/api/flux/projects/2/board/", "http://api.origo.test:8000"),
      { credentials: "include" },
    )
    expect(result.current.selectedProject?.id).toBe(2)
  })

  it("updates the URL when switching from a project detail page", async () => {
    mocks.pathname = "/projects/7"
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }))
    const { result } = renderHook(() => useSelectedFluxProject(), { wrapper })

    await act(async () => {
      await result.current.selectProject("3")
    })

    expect(mocks.pushState).toHaveBeenCalledWith(null, "", "/projects/3")
  })

  it("keeps every project's timeline data when changing the active project", async () => {
    const projectA = makeProject(1, "Projekt A")
    const projectB = makeProject(2, "Projekt B")
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const allProjectsWrapper = ({ children }: { children: React.ReactNode }) => (
      <FluxDataProvider
        scope="all-projects"
        projects={[projectA, projectB]}
        selectedProject={projectA}
        tasks={[makeTask(1, 1), makeTask(2, 2)]}
        milestones={[]}
        updates={[]}
        documents={[]}
        users={[]}
      >
        {children}
      </FluxDataProvider>
    )
    const { result } = renderHook(
      () => ({ selection: useSelectedFluxProject(), tasks: useFluxTasks() }),
      { wrapper: allProjectsWrapper },
    )

    await act(async () => {
      await result.current.selection.selectProject("2")
    })

    expect(result.current.selection.selectedProject?.id).toBe(2)
    expect(result.current.tasks.map((task) => task.project)).toEqual([1, 2])
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
