import type { Metadata } from "next"
import { getFireplaceHeatings, getHeatingLogs, getResidentialHeating } from "@/app/lib/dal/verso"
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
  const [{ data, error }, fireplaces] = connection
    ? await Promise.all([getHeatingLogs(connection.id, page), getFireplaceHeatings(connection.id, 1)])
    : [{ data: null, error: undefined }, { data: null, error: undefined }]

  return (
    <HeatingView
      connection={connection}
      data={data}
      error={error}
      fireplaces={fireplaces.data}
      fireplacesError={fireplaces.error}
    />
  )
}
