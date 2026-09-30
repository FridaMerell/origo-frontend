"use server";

import { cookies } from "next/headers";
import { FLUX_PROJECT_COOKIE } from "@/app/lib/config";

export async function setSelectedFluxProject(id: string) {
  if (!/^\d+$/.test(id)) return;
  (await cookies()).set(FLUX_PROJECT_COOKIE, id, { path: "/", maxAge: 31536000, sameSite: "lax" });
}
