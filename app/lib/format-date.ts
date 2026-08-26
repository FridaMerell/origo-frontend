export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("sv-SE", { dateStyle: "medium" });
}

export function formatDateShort(date: string | Date): string {
  return new Date(date).toLocaleDateString("sv-SE", { month: "short", day: "2-digit" });
}
