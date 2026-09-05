import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { UserProvider, useUsers } from "./user-context"
import type { FluxUser, User } from "@/app/lib/dal"

const wrapper = (user: User | null, users: FluxUser[]) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <UserProvider user={user} users={users}>{children}</UserProvider>
  }

describe("useUsers", () => {
  it("prepends the current user when missing from the member list", () => {
    const user: User = { id: 1, username: "frida" }
    const members: FluxUser[] = [{ id: 2, username: "alex" }]

    const { result } = renderHook(() => useUsers(), { wrapper: wrapper(user, members) })

    expect(result.current.map((u) => u.id)).toEqual([1, 2])
  })

  it("does not duplicate the current user when already a member", () => {
    const user: User = { id: 1, username: "frida" }
    const members: FluxUser[] = [{ id: 1, username: "frida" }, { id: 2, username: "alex" }]

    const { result } = renderHook(() => useUsers(), { wrapper: wrapper(user, members) })

    expect(result.current.map((u) => u.id)).toEqual([1, 2])
  })

  it("returns the member list unchanged when there is no signed-in user", () => {
    const members: FluxUser[] = [{ id: 2, username: "alex" }]

    const { result } = renderHook(() => useUsers(), { wrapper: wrapper(null, members) })

    expect(result.current).toEqual(members)
  })
})
