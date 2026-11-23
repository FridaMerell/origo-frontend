// Opus bläddring i listorna (anteckningar, ordlistor), för den delade Pager:
// föregående till vänster, sidan i mitten, nästa till höger; en knapp som inte går att använda döljs.
export const PAGER_CLASS = "grid grid-cols-[1fr_auto_1fr] items-baseline gap-x-4 text-sm text-text-muted"

export const PAGER_BUTTON =
	"justify-self-start rounded-sm font-display italic whitespace-nowrap hover:text-text cursor-pointer disabled:invisible data-[page-step=next]:justify-self-end focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
