import { beforeEach, describe, expect, it, vi } from "vitest"
import { authedJsonHeaders } from "./auth-headers"
import { getSessionCookies } from "@/app/lib/session"

vi.mock("@/app/lib/session", () => ({
  getSessionCookies: vi.fn(),
}))

describe("authedJsonHeaders", () => {
  beforeEach(() => {
    vi.mocked(getSessionCookies).mockReset()
  })

  it("builds JSON headers with the session cookie and CSRF token", async () => {
    vi.mocked(getSessionCookies).mockResolvedValue({ sessionId: "abc123", csrfToken: "xyz789" })

    const headers = await authedJsonHeaders()

    expect(headers).toEqual({
      "Content-Type": "application/json",
      "X-CSRFToken": "xyz789",
      Cookie: "sessionid=abc123; csrftoken=xyz789",
    })
  })

  it("falls back to an empty CSRF token header when there is none", async () => {
    vi.mocked(getSessionCookies).mockResolvedValue({ sessionId: "abc123", csrfToken: undefined })

    const headers = await authedJsonHeaders()

    expect(headers["X-CSRFToken"]).toBe("")
  })

  it("omits missing cookies from the Cookie header instead of emitting empty values", async () => {
    vi.mocked(getSessionCookies).mockResolvedValue({ sessionId: undefined, csrfToken: "xyz789" })

    const headers = await authedJsonHeaders()

    expect(headers.Cookie).toBe("csrftoken=xyz789")
  })
})
