import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { uploadedFilesFromUrls, useUploadedFiles } from "./useUploadedFiles"

describe("useUploadedFiles", () => {
  it("maps Blob URLs to the UI representation", () => {
    expect(uploadedFilesFromUrls(["https://blob.test/flux/spec.pdf"])).toEqual([
      { url: "https://blob.test/flux/spec.pdf", name: "spec.pdf" },
    ])
  })

  it("exposes only Blob URLs for the Django payload", () => {
    const { result } = renderHook(() => useUploadedFiles(["https://blob.test/a.pdf"], 1))

    expect(result.current.urls).toEqual(["https://blob.test/a.pdf"])
  })

  it("resets files when another model is edited", () => {
    const { result, rerender } = renderHook(
      ({ urls, id }) => useUploadedFiles(urls, id),
      { initialProps: { urls: ["https://blob.test/one.pdf"], id: 1 } }
    )

    act(() => result.current.clear())
    expect(result.current.files).toEqual([])

    rerender({ urls: ["https://blob.test/two.pdf"], id: 2 })
    expect(result.current.urls).toEqual(["https://blob.test/two.pdf"])
  })
})
