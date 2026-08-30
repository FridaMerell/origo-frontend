'use client'
import { followSpecies, unfollowSpecies } from "@/app/actions/tempus"
import { Button } from "@/app/components/ui/Button"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

const FollowButton = ({ initial, taxa, props }: { initial: boolean, taxa: string, props?: React.ComponentProps<typeof Button> }) => {
  const [isFollowing, setIsFollowing] = useState(initial)
  const [notify, setNotify] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const toggle = () => {
    const next = !isFollowing
    setError(null)
    setMenuOpen(false)
    setIsFollowing(next)
    startTransition(async () => {
      const result = next
        ? await followSpecies(taxa, { notificationsEnabled: notify })
        : await unfollowSpecies(taxa)
      if (result.ok) {
        router.refresh()
      } else {
        setIsFollowing(!next)
        setError(result.error ?? "Något gick fel. Försök igen.")
      }
    })
  }

  return (
    <div className="relative flex flex-col items-end gap-1.5">
      <div className="inline-flex">
        <Button
          {...props}
          disabled={isPending}
          className={`rounded-r-none ${isFollowing ? "button-following" : "button-follow"} ${props?.className ?? ""}`}
          onClick={toggle}
        >
          {isFollowing ? "Sparad" : "Spara"}
        </Button>
        <Button
          {...props}
          disabled={isPending}
          aria-label="Fler alternativ"
          aria-expanded={menuOpen}
          className={`rounded-l-none border-l border-accent-contrast/20 px-2 ${props?.className ?? ""}`}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span aria-hidden className={`transition-transform ${menuOpen ? "rotate-180" : ""}`}>▾</span>
        </Button>
      </div>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1.5 w-60 rounded border border-border bg-surface p-1 shadow-md">
            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={notify}
              onClick={() => setNotify((v) => !v)}
              className="flex w-full items-center justify-between gap-3 rounded px-2.5 py-2 text-left text-sm hover:bg-surface-2"
            >
              <span className="flex flex-col">
                <span className="font-medium text-text">Notifiera mig</span>
                <span className="text-xs text-text-muted">Få notiser om den här arten</span>
              </span>
              <span
                aria-hidden
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${notify ? "bg-accent" : "bg-border"}`}
              >
                <span
                  className={`absolute top-0.5 size-4 rounded-full bg-surface transition-all ${notify ? "left-4" : "left-0.5"}`}
                />
              </span>
            </button>
          </div>
        </>
      )}

      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  )
}

export default FollowButton
