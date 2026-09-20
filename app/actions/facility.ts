"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { FACILITY_COOKIE } from "@/app/lib/config"

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export async function selectFacility(id: string) {
  if (!id) return
  const cookieStore = await cookies()
  cookieStore.set(FACILITY_COOKIE, id, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    httpOnly: true,
    sameSite: "lax",
  })
  revalidatePath("/", "layout")
}
