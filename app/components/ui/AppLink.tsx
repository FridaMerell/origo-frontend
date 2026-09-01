"use client"

import NextLink, { useLinkStatus } from "next/link"
import { useEffect, type ComponentProps } from "react"
import { useNavProgressReport } from "@/app/lib/nav-progress"

function PendingReporter() {
  const { pending } = useLinkStatus()
  const report = useNavProgressReport()

  useEffect(() => {
    if (!pending) return
    report(1)
    return () => report(-1)
  }, [pending, report])

  return null
}

/**
 * Drop-in replacement for `next/link` that feeds the global navigation-progress
 * bar (see nav-progress.tsx). Use it in the nav chrome so slow route changes get
 * instant top-bar feedback; a prefetched/instant navigation shows nothing.
 */
export function AppLink({ children, ...props }: ComponentProps<typeof NextLink>) {
  return (
    <NextLink {...props}>
      {children}
      <PendingReporter />
    </NextLink>
  )
}
