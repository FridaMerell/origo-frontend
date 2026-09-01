import { Facility } from "./dal"

// Weather is fetched through our own /api/weather route handler, which proxies
// SMHI and caches the upstream response for 30 min (see app/api/weather/route.ts).
export async function getWeather(facility: Facility) {
  const params = new URLSearchParams({
    lat: String(facility.lat),
    lng: String(facility.lng),
  })
  const response = await fetch(`/api/weather?${params}`)
  if (!response.ok) return null
  return response.json()
}
