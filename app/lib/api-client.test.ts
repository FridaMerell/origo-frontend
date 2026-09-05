import { describe, expect, it } from "vitest"
import { buildCookieHeader, extractSetCookie } from "./api-client"

describe("buildCookieHeader", () => {
  it("joins cookies with '; '", () => {
    expect(buildCookieHeader({ sessionid: "abc", csrftoken: "xyz" })).toBe("sessionid=abc; csrftoken=xyz")
  })

  it("omits undefined values", () => {
    expect(buildCookieHeader({ sessionid: "abc", csrftoken: undefined })).toBe("sessionid=abc")
  })

  it("omits empty-string values", () => {
    expect(buildCookieHeader({ sessionid: "abc", csrftoken: "" })).toBe("sessionid=abc")
  })

  it("returns an empty string when nothing is set", () => {
    expect(buildCookieHeader({ sessionid: undefined, csrftoken: undefined })).toBe("")
  })
})

describe("extractSetCookie", () => {
  function responseWithSetCookies(cookies: string[]): Response {
    const headers = new Headers()
    for (const cookie of cookies) headers.append("set-cookie", cookie)
    return new Response(null, { headers })
  }

  it("extracts the value of a named cookie", () => {
    const response = responseWithSetCookies(["sessionid=abc123; Path=/; HttpOnly"])
    expect(extractSetCookie(response, "sessionid")).toBe("abc123")
  })

  it("picks the matching cookie among several", () => {
    const response = responseWithSetCookies([
      "csrftoken=xyz789; Path=/",
      "sessionid=abc123; Path=/; HttpOnly",
    ])
    expect(extractSetCookie(response, "sessionid")).toBe("abc123")
  })

  it("returns undefined when the cookie is not present", () => {
    const response = responseWithSetCookies(["csrftoken=xyz789; Path=/"])
    expect(extractSetCookie(response, "sessionid")).toBeUndefined()
  })

  it("handles a cookie value that itself contains '='", () => {
    const response = responseWithSetCookies(["token=abc=def==; Path=/"])
    expect(extractSetCookie(response, "token")).toBe("abc=def==")
  })
})
