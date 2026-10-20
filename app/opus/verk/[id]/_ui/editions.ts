/** Utgåvornas färger i ordning: titelbladets utgåvelista och läsvyns kolumner använder samma. */
export const EDITION_COLORS = ["primary", "secondary", "accent", "foreground"]

/** Antal rader per sida. Servern snappar fönstret till sidgränser med samma `limit`. */
export const PAGE_SIZE = 10

export const BAR_CLASS: Record<string, string> = {
	primary: "bg-primary",
	secondary: "bg-secondary",
	accent: "bg-accent",
	foreground: "bg-foreground",
}

export const BORDER_CLASS: Record<string, string> = {
	primary: "border-l-primary/50 group-hover/row:border-l-primary",
	secondary: "border-l-secondary/50 group-hover/row:border-l-secondary",
	accent: "border-l-accent/50 group-hover/row:border-l-accent",
	foreground: "border-l-foreground/50 group-hover/row:border-l-foreground",
}
