import type { Metadata } from "next"
import { getVenture, getVentureTask } from "@/app/lib/dal"
import VentureTaskView from "./task-view"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>
}): Promise<Metadata> {
  const { id, taskId } = await params
  const [venture, task] = await Promise.all([getVenture(id), getVentureTask(taskId)])

  return {
    title: task ? `${task.name} | Planering` : "Uppgift | Planering",
    description: task
      ? task.description || (venture ? `Uppgift i ${venture.name}` : task.name)
      : "Uppgift i Verso",
  }
}

export default function VentureTaskPage() {
  return <VentureTaskView />
}
