import { Facility } from "./dal"

export type WeatherForecast = {
  timeSeries: Array<{
    time: string
    data: Record<string, number>
  }>
}

// Weather is fetched through our own /api/weather route handler, which proxies
// SMHI and caches the upstream response for 30 min (see app/api/weather/route.ts).
export async function getWeather(facility: Facility): Promise<WeatherForecast | null> {
  const params = new URLSearchParams({
    lat: String(facility.lat),
    lng: String(facility.lng),
  })
  const response = await fetch(`/api/weather?${params}`)
  if (!response.ok) return null
  return response.json() as Promise<WeatherForecast>
}

// SMHI/WMO weather symbol codes (Wsymb2):
// 1 Clear sky · 2 Nearly clear sky · 3 Variable cloudiness · 4 Halfclear sky
// 5 Cloudy sky · 6 Overcast · 7 Fog · 8-10 Rain showers (light/moderate/heavy)
// 11 Thunderstorm · 12-14 Sleet showers (light/moderate/heavy)
// 15-17 Snow showers (light/moderate/heavy) · 18-20 Rain (light/moderate/heavy)
// 21 Thunder · 22-24 Sleet (light/moderate/heavy) · 25-27 Snowfall (light/moderate/heavy)
export function getWeatherIconName(symbolCode: number, daytime: boolean): string | null {
  switch (symbolCode) {
    case 1:
      return daytime ? "sun" : "moon"
    case 2:
      return daytime ? "cloud-sun" : "cloud-moon"
    case 3:
    case 4:
      return "cloud"
    case 5:
    case 6:
      return "clouds"
    case 7:
      return "cloud-fog"
    case 8:
    case 9:
    case 10:
    case 18:
    case 19:
    case 20:
      return "cloud-rain"
    case 11:
    case 21:
      return "cloud-lightning"
    case 12:
    case 13:
    case 14:
    case 22:
    case 23:
    case 24:
      return "cloud-snow"
    default:
      return null
  }
}
