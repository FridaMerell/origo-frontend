"use client"

import { useEffect } from "react"

// Checkboxes stay out of the list: ticking species and then paging on is the point.
const TAKES_ARROWS = "input:not([type='checkbox']), textarea, select, [contenteditable='true']"

// With several pagers on a page, the one whose list is under the pointer or holds
// the focus decides, and otherwise the page's main list. A `side` pager sits beside
// a heading within a larger section, so it is asked first and never the default.
function currentPager() {
  const pagers = Array.from(document.querySelectorAll<HTMLElement>("[data-pager]")).filter((pager) => pager.getClientRects().length > 0)
  const engaged = (pager: HTMLElement) => {
    const scope = pager.closest("[data-pager-scope], section") ?? pager
    return scope.matches(":hover") || scope.contains(document.activeElement)
  }
  return pagers.find((pager) => pager.dataset.pager === "side" && engaged(pager))
    ?? pagers.find(engaged)
    ?? pagers.find((pager) => pager.dataset.pager !== "side")
}

// Left and right press the visible page steps, so a step behaves the same from
// the keyboard as when clicked. While a modal is open its own keys are left alone.
export function usePagerArrowKeys() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
      if (event.repeat || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
      if (event.target instanceof HTMLElement && event.target.matches(TAKES_ARROWS)) return
      if (document.querySelector('[aria-modal="true"]')) return
      const step = currentPager()?.querySelector<HTMLElement>(`[data-page-step="${event.key === "ArrowLeft" ? "previous" : "next"}"]`)
      if (!step || step.matches(":disabled")) return
      event.preventDefault()
      step.click()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])
}
