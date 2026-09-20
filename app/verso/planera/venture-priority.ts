export const PRIORITY_LABEL: Record<number, string> = {
  1: "Hög prio",
  2: "Vore bra",
  3: "Vore kul",
  4: "Ej prio",
  5: "Vore möjligt",
};

export function priorityLabel(priority: number) {
  return PRIORITY_LABEL[priority] ?? "Ej prio";
}
