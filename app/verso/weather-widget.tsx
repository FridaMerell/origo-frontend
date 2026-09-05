"use client"

import { useEffect, useState } from "react"
import { Facility } from "../lib/dal"
import { Card } from "../components/ui/Card"
import { getWeather, getWeatherIconName, type WeatherForecast } from "../lib/weather-client"
import { StepperButtons } from "./stepper-buttons"
import { Cloud, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudSnow, CloudSun, Cloudy, Moon, Sun, Wind } from "lucide-react"

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

  return <Card className="col-span-1 min-h-52 p-5 lg:col-span-5">
    {weather ? (
      weather.timeSeries && weather.timeSeries.length > 0 ? (
        <div className="flex h-full flex-col justify-between gap-5">
          <div className="flex flex-col gap-4">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              <Wind size={14} />
              Väder nu
            </span>
            <div className="flex items-end justify-between gap-4">
              <div className="flex items-center gap-3 font-display text-accent">
                <WeatherIcon size={38} strokeWidth={1.5} />
                <span className="text-4xl font-semibold leading-none">{weather.timeSeries[index].data.air_temperature}°</span>
              </div>
              <span className="pb-1 text-xs text-text-faint">
                {new Date(weather.timeSeries[index].time).toLocaleString("sv-SE", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-text-muted">
            <span>Vind {weather.timeSeries[index].data.wind_speed} m/s</span>
            <span>Fukt {weather.timeSeries[index].data.relative_humidity}%</span>
            <span>Nederbörd {weather.timeSeries[index].data.precipitation_amount_mean} mm</span>
            <span>Sikt {weather.timeSeries[index].data.visibility_in_air} km</span>
          </div>
          <StepperButtons index={index} length={weather.timeSeries.length} onIndexChange={setIndex} className="flex justify-between gap-1" />
        </div>
      ) : (
        <div className="flex h-full items-center text-sm text-text-muted">Ingen väderdata tillgänglig.</div>
      )
    ) : (
      <div className="flex h-full items-center text-sm text-text-muted">Hämtar väderdata...</div>
    )}
  </Card>
}
