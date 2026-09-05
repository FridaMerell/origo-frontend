import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { FluxDataProvider, useSelectedFluxProject } from "./flux-context"
import { FLUX_PROJECT_COOKIE } from "@/app/lib/config"
import type { FluxProject } from "@/app/lib/dal"

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
  const reloadMock = vi.fn()

  beforeEach(() => {
    document.cookie = `${FLUX_PROJECT_COOKIE}=; path=/; max-age=0`
    reloadMock.mockClear()
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    })
  })

  afterEach(() => {
    document.cookie = `${FLUX_PROJECT_COOKIE}=; path=/; max-age=0`
  })

  it("writes the chosen project id to the selected-project cookie", () => {
    const { result } = renderHook(() => useSelectedFluxProject(), { wrapper })

    act(() => result.current.selectProject("2"))

    expect(document.cookie).toContain(`${FLUX_PROJECT_COOKIE}=2`)
  })

  it("reloads the page so the server can re-render for the new project", () => {
    const { result } = renderHook(() => useSelectedFluxProject(), { wrapper })

    act(() => result.current.selectProject("2"))

    expect(reloadMock).toHaveBeenCalledOnce()
  })
})
