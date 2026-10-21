import { cookies } from "next/headers"
import type { ColorMode } from "@/app/components/ui/use-stored-mode"

// The visitor's chosen mode for an app, read on the server from the cookie
// useStoredMode writes, so the first paint is already in it.
export async function readStoredMode(key: string): Promise<ColorMode | null> {
  const stored = (await cookies()).get(key)?.value
  return stored === "dark" || stored === "light" ? stored : null
}
