import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/app/lib/dal/auth"
import { getTempusProfile } from "@/app/lib/dal/tempus/observations"
import { Profile } from "./profile"

export const metadata: Metadata = { title: "Profil | Tempus", description: "Dina siffror i Tempus." }

export default async function ProfilePage() {
  if (!(await getCurrentUser())) redirect("/login")

  const profile = await getTempusProfile()
  if (!profile) {
    return (
      <div className="container mx-auto py-16 text-center max-sm:px-4">
        <p className="font-display text-xl italic">Profilen kunde inte hämtas.</p>
        <p className="mt-2 text-sm text-text-muted">Ladda om sidan om en stund.</p>
      </div>
    )
  }
  return <Profile profile={profile} />
}
