"use client"

import { useEffect, useState } from "react"
import { Facility } from "../lib/dal"
import { Card } from "../components/ui/Card"
import { getWeather, getWeatherIconName, type WeatherForecast } from "../lib/weather-client"
import { StepperButtons } from "./stepper-buttons"
import { Cloud, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudSnow, CloudSun, Cloudy, Moon, Sun } from "lucide-react"

const weatherIcons = {
  "sun": Sun,
  "moon": Moon,
  "cloud-sun": CloudSun,
  "cloud-moon": CloudMoon,
  "cloud": Cloud,
  "clouds": Cloudy,
  "cloud-fog": CloudFog,
  "cloud-rain": CloudRain,
  "cloud-lightning": CloudLightning,
  "cloud-snow": CloudSnow,
} as const

export function WeatherWidget({ facility }: { facility: Facility }) {
  const [weather, setWeather] = useState<WeatherForecast | null>(null)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    getWeather(facility).then((data) => {
      setWeather(data)
    })
  }, [facility])

  const current = weather?.timeSeries?.[index]
  const daytime = current ? (new Date(current.time)).getHours() >= 6 && (new Date(current.time)).getHours() < 18 : true
  const weatherIcon = current ? getWeatherIconName(current.data.symbol_code, daytime) : null
  const WeatherIcon = weatherIcons[weatherIcon as keyof typeof weatherIcons] ?? Cloud

  return <Card className="p-4 w-full col-span-6 md:col-span-2 lg:col-span-2">
    {weather ? (
      weather.timeSeries && weather.timeSeries.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 font-display text-accent">
              <span className={'pt'}>

                <WeatherIcon size={34} />
              </span>
              <span className="text-xl font-semibold ">{weather.timeSeries[index].data.air_temperature}°C</span>
              <span className="text-sm text-text-muted">({new Date(weather.timeSeries[index].time).toLocaleString("sv-SE", { hour: "2-digit", minute: "2-digit" })})</span>
            </div>
            <div>
            </div>
          </div>
          <div className="flex gap-1 justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-text-muted">Vind: {weather.timeSeries[index].data.wind_speed} m/s, {weather.timeSeries[index].data.wind_from_direction}°</span>
              <span className="text-sm text-text-muted">Luftfuktighet: {weather.timeSeries[index].data.relative_humidity}%</span>
              <span className="text-sm text-text-muted">Lufttryck: {weather.timeSeries[index].data.air_pressure_at_mean_sea_level} hPa</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm text-text-muted">Nederbörd: {weather.timeSeries[index].data.precipitation_amount_mean} mm</span>
              <span className="text-sm text-text-muted">Sikt: {weather.timeSeries[index].data.visibility_in_air} km</span>
              <span className="text-sm text-text-muted">Molnighet: {weather.timeSeries[index].data.cloud_area_fraction}%</span>
            </div>
          </div>

          <StepperButtons index={index} length={weather.timeSeries.length} onIndexChange={setIndex} />
        </div>
      ) : (
        <div className="text-center text-text-muted">Ingen väderdata tillgänglig.</div>
      )
    ) : (
      <div className="text-center text-text-muted">Hämtar väderdata...</div>
    )}
  </Card>
}
