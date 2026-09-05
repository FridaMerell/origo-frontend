import { beforeEach, describe, expect, it, vi } from "vitest"
import { fetchPage, paginationQuery } from "./pagination"
import { getSessionCookies } from "@/app/lib/session"
import { fetchOrigoApi } from "@/app/lib/api-client"

vi.mock("@/app/lib/session", () => ({
  getSessionCookies: vi.fn(),
}))

vi.mock("@/app/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/lib/api-client")>()
  return { ...actual, fetchOrigoApi: vi.fn() }
})

describe("paginationQuery", () => {
  it("defaults to page 1 with the default page size", () => {
    expect(paginationQuery(undefined, 25, 50)).toEqual({
      page: 1,
      page_size: 25,
      limit: 25,
      offset: 0,
    })
  })

  it("uses the requested page and page size, computing the offset", () => {
    expect(paginationQuery({ page: 3, page_size: 10 }, 25, 50)).toEqual({
      page: 3,
      page_size: 10,
      limit: 10,
      offset: 20,
    })
  })

  it("clamps an oversized page size to the maximum", () => {
    const result = paginationQuery({ page_size: 999 }, 25, 50)
    expect(result.page_size).toBe(50)
    expect(result.limit).toBe(50)
  })

  it("ignores a non-positive or missing page number, defaulting to 1", () => {
    expect(paginationQuery({ page: -1 }, 25, 50).page).toBe(1)
    expect(paginationQuery({ page: 0 }, 25, 50).page).toBe(1)
    expect(paginationQuery({}, 25, 50).page).toBe(1)
  })

  it("preserves other params passed through", () => {
    expect(paginationQuery({ search: "foo" }, 25, 50)).toMatchObject({ search: "foo" })
  })
})

describe("fetchPage", () => {
  beforeEach(() => {
    vi.mocked(getSessionCookies).mockReset()
    vi.mocked(fetchOrigoApi).mockReset()
  })

  it("returns an empty page without calling the API when there is no session", async () => {
    vi.mocked(getSessionCookies).mockResolvedValue({ sessionId: undefined, csrfToken: undefined })

    const result = await fetchPage("/things/")

    expect(result).toEqual({ results: [], count: 0, next: null, previous: null })
    expect(fetchOrigoApi).not.toHaveBeenCalled()
  })

  it("returns an empty page when the response is not ok", async () => {
    vi.mocked(getSessionCookies).mockResolvedValue({ sessionId: "abc", csrfToken: "xyz" })
    vi.mocked(fetchOrigoApi).mockResolvedValue({ ok: false } as Response)

    const result = await fetchPage("/things/")

    expect(result).toEqual({ results: [], count: 0, next: null, previous: null })
  })

  it("parses a paginated envelope response", async () => {
    vi.mocked(getSessionCookies).mockResolvedValue({ sessionId: "abc", csrfToken: "xyz" })
    vi.mocked(fetchOrigoApi).mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ id: 1 }, { id: 2 }], count: 2, next: "?page=2", previous: null }),
    } as unknown as Response)

    const result = await fetchPage("/things/")

    expect(result).toEqual({ results: [{ id: 1 }, { id: 2 }], count: 2, next: "?page=2", previous: null })
  })

  it("falls back to the results length when count is missing", async () => {
    vi.mocked(getSessionCookies).mockResolvedValue({ sessionId: "abc", csrfToken: "xyz" })
    vi.mocked(fetchOrigoApi).mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ id: 1 }] }),
    } as unknown as Response)

    const result = await fetchPage("/things/")

    expect(result).toEqual({ results: [{ id: 1 }], count: 1, next: null, previous: null })
  })

  it("wraps a plain array response as a single page", async () => {
    vi.mocked(getSessionCookies).mockResolvedValue({ sessionId: "abc", csrfToken: "xyz" })
    vi.mocked(fetchOrigoApi).mockResolvedValue({
      ok: true,
      json: async () => [{ id: 1 }, { id: 2 }, { id: 3 }],
    } as unknown as Response)

    const result = await fetchPage("/things/")

    expect(result).toEqual({ results: [{ id: 1 }, { id: 2 }, { id: 3 }], count: 3, next: null, previous: null })
  })

  it("builds the request path with the given query params", async () => {
    vi.mocked(getSessionCookies).mockResolvedValue({ sessionId: "abc", csrfToken: "xyz" })
    vi.mocked(fetchOrigoApi).mockResolvedValue({ ok: true, json: async () => [] } as unknown as Response)

    await fetchPage("/things/", { page: 2, page_size: 10 })

    expect(fetchOrigoApi).toHaveBeenCalledWith(
      "/things/?page=2&page_size=10",
      expect.objectContaining({ headers: expect.objectContaining({ Cookie: expect.stringContaining("sessionid=abc") }) }),
    )
  })
})
