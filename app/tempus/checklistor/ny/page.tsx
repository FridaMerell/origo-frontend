import type { Metadata } from "next"
import ChecklistBuilder from "../checklist-builder"

export const metadata: Metadata = {
  title: "Ny checklista | Tempus",
  description: "Skapa en artchecklista manuellt eller genom CSV-import.",
}

export default function NewChecklistPage() {
  return <ChecklistBuilder />
}
