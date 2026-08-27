import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useSubmitAction } from "./useSubmitAction"

describe("useSubmitAction", () => {
  it("surfaces server errors without running success behavior", async () => {
    const setError = vi.fn()
    const onSuccess = vi.fn()
    const { result } = renderHook(() => useSubmitAction(setError))

    await act(() => result.current(async () => ({ error: "Kunde inte spara." }), onSuccess))

    expect(setError).toHaveBeenCalledWith("root", { message: "Kunde inte spara." })
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it("runs the form-owned success behavior", async () => {
    const onSuccess = vi.fn()
    const { result } = renderHook(() => useSubmitAction(vi.fn()))

    await act(() => result.current(async () => undefined, onSuccess))

    expect(onSuccess).toHaveBeenCalledOnce()
  })
})
