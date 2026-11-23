import { useEffect } from "react"

export type PageMeta = {
  /** The whole title, in the same form as `metadata`, e.g. "Platser | Tempus". */
  title?: string
  description?: string
}

/**
 * Sets the page's title and description from data fetched in the client. A value that is
 * undefined (e.g. while loading) leaves the page's own `metadata` in place. On unmount or
 * change the previous value comes back, unless something else (such as the next route's
 * metadata) has replaced it meanwhile.
 */
export function usePageMeta({ title, description }: PageMeta) {
  useEffect(() => {
    if (title === undefined) return
    const previous = document.title
    document.title = title
    return () => {
      if (document.title === title) document.title = previous
    }
  }, [title])

  useEffect(() => {
    if (description === undefined) return
    let tag = document.head.querySelector<HTMLMetaElement>('meta[name="description"]')
    const created = !tag
    if (!tag) {
      tag = document.createElement("meta")
      tag.name = "description"
      document.head.appendChild(tag)
    }
    const element = tag
    const previous = element.content
    element.content = description
    return () => {
      if (!element.isConnected || element.content !== description) return
      if (created) element.remove()
      else element.content = previous
    }
  }, [description])
}
