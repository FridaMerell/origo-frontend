"use client"

import type { ComponentProps, MouseEvent } from "react"
import { useOverview } from "./overview-provider"
import type { SelectionChange } from "./selection"

// A link that changes the start page's selection in place. It carries the real
// address, so it can still be opened in a new tab or copied.
export function SelectionLink({
  change,
  onClick,
  ...props
}: { change: SelectionChange } & Omit<ComponentProps<"a">, "href">) {
  const { hrefFor, select } = useOverview()

  const choose = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    select(change)
  }

  return <a href={hrefFor(change)} onClick={choose} {...props} />
}
