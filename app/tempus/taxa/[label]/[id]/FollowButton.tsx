'use client'
import { followSpecies, unfollowSpecies } from "@/app/tempus/_actions/species"
import { Button } from "@/app/components/ui/Button"
import { useToast } from "@/app/components/ui/ToastProvider"
import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition } from "react"
import { Check, ChevronDown } from "lucide-react"

const FollowButton = ({ initial, initialNotify, taxa, props }: { initial: boolean, initialNotify: boolean, taxa: string, props?: React.ComponentProps<typeof Button> }) => {
  const [isFollowing, setIsFollowing] = useState(initial)
  const [notify, setNotify] = useState(initialNotify)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    setIsFollowing(initial)
    setNotify(initialNotify)
  }, [initial, initialNotify])

  const toggle = () => {
    const next = !isFollowing
    setMenuOpen(false)
    setIsFollowing(next)
    startTransition(async () => {
      try {
        const result = next
          ? await followSpecies(taxa, { notificationsEnabled: notify })
          : await unfollowSpecies(taxa)
        if (result.ok) {
          toast({
            title: next ? "Arten är sparad" : "Arten är inte längre sparad",
            variant: "success",
          })
          router.refresh()
          return
        }
        setIsFollowing(!next)
        toast({
          title: "Kunde inte ändra sparningen",
          description: result.error ?? "Något gick fel. Försök igen.",
          variant: "error",
        })
      } catch {
        setIsFollowing(!next)
        toast({
          title: "Kunde inte ändra sparningen",
          description: "Kunde inte kontakta servern. Försök igen.",
          variant: "error",
        })
      }
    })
  }

  const toggleNotifications = () => {
    const next = !notify
    setNotify(next)
    if (!isFollowing) return

    startTransition(async () => {
      try {
        const result = await followSpecies(taxa, { notificationsEnabled: next })
        if (result.ok) {
          toast({
            title: "Notisinställningen är sparad",
            description: next ? "Du får notiser om den här arten." : "Du får inte längre notiser om den här arten.",
            variant: "success",
          })
          router.refresh()
          return
        }
        setNotify(!next)
        toast({
          title: "Kunde inte spara notisinställningen",
          description: result.error ?? "Något gick fel. Försök igen.",
          variant: "error",
        })
      } catch {
        setNotify(!next)
        toast({
          title: "Kunde inte spara notisinställningen",
          description: "Kunde inte kontakta servern. Försök igen.",
          variant: "error",
        })
      }
    })
  }

  return (
    <div className="relative flex flex-col items-end gap-1.5">
      <div className="inline-flex overflow-hidden rounded-md border border-accent bg-surface">
        <Button
          variant="paper"
          {...props}
          disabled={isPending}
          className={`h-10 min-h-0 rounded-none border-0 bg-transparent px-3 !text-accent hover:bg-accent-wash ${isFollowing ? "font-semibold" : ""} ${props?.className ?? ""}`}
          onClick={toggle}
        >
          {isFollowing ? <Check size={15} /> : null}
          {isFollowing ? "Sparad" : "Spara"}
        </Button>
        <Button
          variant="paper"
          {...props}
          disabled={isPending}
          aria-label="Fler alternativ"
          aria-expanded={menuOpen}
          className={`h-10 min-h-0 rounded-none border-0 border-l border-accent/30 bg-transparent px-2 !text-accent hover:bg-accent-wash ${props?.className ?? ""}`}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <ChevronDown size={15} className={`transition-transform ${menuOpen ? "rotate-180" : ""}`} />
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
              disabled={isPending}
              onClick={toggleNotifications}
              className="flex w-full items-center justify-between gap-3 rounded px-2.5 py-2 text-left text-sm hover:bg-surface-2"
            >
              <span className="flex flex-col">
                <span className="font-medium text-text">Påminn mig</span>
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
    </div>
  )
}

export default FollowButton
