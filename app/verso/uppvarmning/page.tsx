import type { Metadata } from "next"
import { getHeatingLogs, getResidentialHeating } from "@/app/lib/dal/verso"
import { resolveSelectedHouse } from "@/app/lib/selected-facility"
import HeatingView from "./heating-view"

export const metadata: Metadata = {
  title: "Uppvärmning | Verso",
  description: "Uppvärmning - Origo",
}

export default async function HeatingPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const [house, params] = await Promise.all([resolveSelectedHouse(), searchParams])
  const page = Math.max(1, Number(params.page) || 1)
  const connection = house ? await getResidentialHeating(house) : null
  const { data, error } = connection ? await getHeatingLogs(connection.id, page) : { data: null, error: undefined }

  return <HeatingView connection={connection} data={data} error={error} />
}
