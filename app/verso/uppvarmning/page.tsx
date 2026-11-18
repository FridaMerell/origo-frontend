import type { Metadata } from "next"
import { getFireplaceHeatings, getHeatingLogs, getResidentialHeating } from "@/app/lib/dal/verso"
import { resolveSelectedHouse } from "@/app/lib/selected-facility"
import HeatingView from "./heating-view"

export const metadata: Metadata = {
  title: "Uppvärmning | Verso",
  description: "Uppvärmning - Origo",
}

export default async function HeatingPage({ searchParams }: { searchParams: Promise<{ page?: string; brasor?: string }> }) {
  const [house, params] = await Promise.all([resolveSelectedHouse(), searchParams])
  const page = Math.max(1, Number(params.page) || 1)
  const fireplacePage = Math.max(1, Number(params.brasor) || 1)
  const connection = house ? await getResidentialHeating(house) : null
  const [logs, fireplaces] = connection
    ? await Promise.all([getHeatingLogs(connection.id, page), getFireplaceHeatings(connection.id, fireplacePage)])
    : [null, null]
  const { data, error } = logs ?? { data: null, error: undefined }

  return (
    <HeatingView
      connection={connection}
      data={data}
      error={error}
      fireplaces={fireplaces?.data ?? null}
      fireplacesError={fireplaces?.error}
    />
  )
}
