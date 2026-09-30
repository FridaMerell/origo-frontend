import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { FluxDataProvider, useFluxTasks, useSelectedFluxProject } from "./flux-context"
import { FLUX_PROJECT_COOKIE } from "@/app/lib/config"
import type { FluxProject, FluxTask } from "@/app/lib/dal"

const mocks = vi.hoisted(() => ({
  pathname: "/",
  refresh: vi.fn(),
  push: vi.fn(),
  setSelected: vi.fn(async () => {}),
}))

vi.mock("./select-project-action", () => ({ setSelectedFluxProject: mocks.setSelected }))

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ refresh: mocks.refresh, push: mocks.push }),
}))

function makeProject(id: number, name: string): FluxProject {
  return { id, name, description: "", members: [], files: [], include_identity: false, identity: null, created_at: "", updated_at: "" }
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
    mocks.refresh.mockClear()
    mocks.push.mockClear()
    document.cookie = `${FLUX_PROJECT_COOKIE}=; path=/; max-age=0`
  })

  it("writes the chosen project id and refreshes the server-rendered page", async () => {
    const { result } = renderHook(() => useSelectedFluxProject(), { wrapper })

    await act(async () => {
      await result.current.selectProject("2")
    })

    expect(document.cookie).toContain(`${FLUX_PROJECT_COOKIE}=2`)
    expect(mocks.refresh).toHaveBeenCalled()
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it("navigates when switching from a project detail page", async () => {
    mocks.pathname = "/projects/7"
    const { result } = renderHook(() => useSelectedFluxProject(), { wrapper })

    await act(async () => {
      await result.current.selectProject("3")
    })

    expect(mocks.push).toHaveBeenCalledWith("/projects/3")
  })

  it("leaves an item page of the previous project for its section overview", async () => {
    mocks.pathname = "/model/api/resources/12/edit"
    const { result } = renderHook(() => useSelectedFluxProject(), { wrapper })

    await act(async () => {
      await result.current.selectProject("2")
    })

    expect(mocks.setSelected).toHaveBeenCalledWith("2")
    expect(mocks.push).toHaveBeenCalledWith("/model/api")
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
