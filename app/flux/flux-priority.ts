import type { FluxTaskPriority } from "@/app/lib/dal";

export const FLUX_PRIORITY_LABEL: Record<FluxTaskPriority, string> = {
  high: "Hög",
  medium: "Medel",
  low: "Låg",
};

export const FLUX_PRIORITY_BADGE_TONE: Record<FluxTaskPriority, string> = {
  high: "text-danger bg-danger-wash",
  medium: "text-warning bg-warning-wash",
  low: "text-text-muted bg-surface-2",
};

export const FLUX_PRIORITY_SECTIONS: {
  priority: FluxTaskPriority;
  label: string;
  color: string;
  textColor: string;
}[] = [
  { priority: "high", label: "Hög prioritet", color: "bg-danger", textColor: "text-danger" },
  { priority: "medium", label: "Mellanprioritet", color: "bg-warning", textColor: "text-warning" },
  { priority: "low", label: "Låg prioritet", color: "bg-text-faint", textColor: "text-text-muted" },
];
