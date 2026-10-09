// Looks that recur across the start page, named once.

// Every label: small capitals in mono.
export const LABEL = "font-mono text-[11px] uppercase tracking-[.14em]"

// The row under the pointer, in every list of species.
export const ROW_HOVER = "transition-colors hover:bg-accent-wash"

// Content that is waiting for a newer answer stays up, dimmed.
export const pending = (loading: boolean) => `transition-opacity duration-150 ${loading ? "opacity-50" : ""}`
