"use client"

type LocaleAtlasPaginationProps = {
  page: number
  pageCount: number
  ariaLabel: string
  onPageChange: (page: number) => void
}

export function LocaleAtlasPagination({
  page,
  pageCount,
  ariaLabel,
  onPageChange,
}: LocaleAtlasPaginationProps) {
  if (pageCount <= 1) return null

  return (
    <nav
      className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-2 px-4 py-3 text-sm text-text-muted"
      aria-label={ariaLabel}
    >
      <span className="whitespace-nowrap font-display italic">Sida {page} av {pageCount}</span>
      <span className="justify-self-center">
        {page > 1 ? (
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            className="whitespace-nowrap font-display italic hover:text-accent"
          >
            Föregående
          </button>
        ) : null}
      </span>
      <span className="justify-self-end">
        {page < pageCount ? (
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            className="whitespace-nowrap font-display italic hover:text-accent"
          >
            Nästa
          </button>
        ) : null}
      </span>
    </nav>
  )
}
