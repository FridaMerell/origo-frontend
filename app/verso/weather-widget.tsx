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

  return <Card className="col-span-1 h-full lg:col-span-5">
    {weather ? (
      weather.timeSeries && weather.timeSeries.length > 0 ? (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-text-muted">Väder</span>
            <StepperButtons index={index} length={weather.timeSeries.length} onIndexChange={setIndex} className="flex" />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <WeatherIcon size={42} strokeWidth={1.5} className="text-accent" />
            <span className="font-display text-5xl font-semibold leading-none text-text">{weather.timeSeries[index].data.air_temperature}°</span>
            <span className="ml-auto text-xs text-text-faint">
              {new Date(weather.timeSeries[index].time).toLocaleString("sv-SE", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div className="mt-auto grid grid-cols-2 gap-x-5 gap-y-2 border-t border-border pt-3 text-xs">
            <span className="flex justify-between gap-2 text-text-muted">Vind <strong className="font-medium text-text">{weather.timeSeries[index].data.wind_speed} m/s</strong></span>
            <span className="flex justify-between gap-2 text-text-muted">Fukt <strong className="font-medium text-text">{weather.timeSeries[index].data.relative_humidity}%</strong></span>
            <span className="flex justify-between gap-2 text-text-muted">Nederbörd <strong className="font-medium text-text">{weather.timeSeries[index].data.precipitation_amount_mean} mm</strong></span>
            <span className="flex justify-between gap-2 text-text-muted">Sikt <strong className="font-medium text-text">{weather.timeSeries[index].data.visibility_in_air} km</strong></span>
          </div>
        </div>
      ) : (
        <div className="flex h-full items-center text-sm text-text-muted">Ingen väderdata tillgänglig.</div>
      )
    ) : (
      <div className="flex h-full items-center text-sm text-text-muted">Hämtar väderdata...</div>
    )}
  </Card>
}
