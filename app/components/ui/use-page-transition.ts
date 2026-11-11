"use client"

import { useCallback, useLayoutEffect, useRef } from "react"

const SHIFT_PX = 16
const LEAVE_MS = 140
const ENTER_MS = 220
const STAGGER_MS = 25
const EASING = "cubic-bezier(.2,.7,.2,1)"

// A paginated list's page change, in two halves. `leave` runs the moment a
// pager step is clicked: the current rows slide away from the side being paged
// towards and fade down, so the click answers at once while the next page
// loads, and the list's head scrolls into view. When the new page arrives its rows fade in one after another from that
// side. Nothing plays on first render or with reduced motion.
export function usePageTransition<T extends HTMLElement>(page: number) {
  const ref = useRef<T>(null)
  const previous = useRef(page)

  const leave = useCallback((target: number) => {
    const list = ref.current
    if (!list || target === previous.current) return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    // The new page is read from its top, so the list's head is brought into view.
    const head = list.parentElement ?? list
    if (head.getBoundingClientRect().top < 0) head.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" })
    if (reduced) return
    const shift = target > previous.current ? -SHIFT_PX : SHIFT_PX
    for (const row of Array.from(list.children)) {
      row.animate(
        [{ opacity: 1, transform: "none" }, { opacity: 0.25, transform: `translateX(${shift}px)` }],
        { duration: LEAVE_MS, easing: EASING, fill: "forwards" },
      )
    }
  }, [])

  useLayoutEffect(() => {
    const from = previous.current
    previous.current = page
    const list = ref.current
    if (!list || from === page) return
    // Rows React kept from the old page still hold their leave pose.
    for (const row of Array.from(list.children)) row.getAnimations().forEach((animation) => animation.cancel())
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const shift = page > from ? SHIFT_PX : -SHIFT_PX
    const animations = Array.from(list.children).map((row, index) =>
      row.animate(
        [
          { opacity: 0.25, transform: `translateX(${shift}px)` },
          { opacity: 1, transform: "none" },
        ],
        { duration: ENTER_MS, delay: index * STAGGER_MS, easing: EASING, fill: "backwards" },
      ),
    )
    return () => animations.forEach((animation) => animation.cancel())
  }, [page])

  return { ref, leave }
}
