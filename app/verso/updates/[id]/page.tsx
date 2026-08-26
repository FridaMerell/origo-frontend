import type { Metadata } from "next"
import { getVersoUpdate } from "@/app/lib/dal"
import UpdateView from "./update-view"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const update = await getVersoUpdate(id)

  return {
    title: update ? `${update.title} | Verso` : "Uppdatering | Verso",
    description: update ? update.content.slice(0, 160) : "Uppdatering",
  }
}

export default function UpdatePage() {
  return <UpdateView />
}
