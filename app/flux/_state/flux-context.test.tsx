import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { FluxDataProvider, useSelectedFluxProject } from "./flux-context"
import type { FluxBoard, FluxProject } from "@/app/lib/dal"

const mocks = vi.hoisted(() => ({
  pathname: "/",
  replace: vi.fn(),
  selectFluxProject: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ replace: mocks.replace }),
}))

vi.mock("@/app/actions/flux/selected-project", () => ({
  selectFluxProject: mocks.selectFluxProject,
}))

function makeProject(id: number, name: string): FluxProject {
  return { id, name, description: "", members: [], files: [], created_at: "", updated_at: "" }
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
    mocks.replace.mockClear()
    mocks.selectFluxProject.mockReset()
  })

  it("requests the chosen project's data", async () => {
    mocks.selectFluxProject.mockResolvedValue({})
    const { result } = renderHook(() => useSelectedFluxProject(), { wrapper })

    await act(async () => {
      await result.current.selectProject("2")
    })

    expect(mocks.selectFluxProject).toHaveBeenCalledWith("2")
  })

  it("updates the URL when switching from a project detail page", async () => {
    mocks.pathname = "/projects/7"
    const project = makeProject(3, "Projekt C")
    mocks.selectFluxProject.mockResolvedValue({
      board: {
        project,
        projects: [project],
        tasks: [],
        milestones: [],
        updates: [],
        documents: [],
        users: [],
      } satisfies FluxBoard,
    })
    const { result } = renderHook(() => useSelectedFluxProject(), { wrapper })

    await act(async () => {
      await result.current.selectProject("3")
    })

    expect(mocks.replace).toHaveBeenCalledWith("/projects/3")
  })
})
