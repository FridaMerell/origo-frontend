"use client"

import { useEffect, useState, type ReactNode } from "react"
import type { Facility } from "@/app/lib/dal"
import { Card } from "@/app/components/ui/Card"
import { getWeather, getWeatherIconName, type WeatherForecast } from "@/app/lib/weather-client"
import { StepperButtons } from "@/app/verso/ui/stepper-buttons"
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

const isDaytime = (time: string) => {
  const hour = new Date(time).getHours()
  return hour >= 6 && hour < 18
}

function Measurement({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="flex justify-between gap-2 text-text-muted">
      {label} <strong className="font-medium text-text">{children}</strong>
    </span>
  )
}

export function WeatherWidget({ facility }: { facility: Facility }) {
  const [weather, setWeather] = useState<WeatherForecast | null>(null)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    getWeather(facility).then(setWeather)
  }, [facility])

  const series = weather?.timeSeries ?? []
  const current = series[index]

  return (
    <Card className="col-span-1 h-full min-w-0 lg:col-span-5">
      {!weather ? (
        <div className="flex h-full items-center text-sm text-text-muted">Hämtar väderdata...</div>
      ) : !current ? (
        <div className="flex h-full items-center text-sm text-text-muted">Ingen väderdata tillgänglig.</div>
      ) : (
        <CurrentWeather series={series} index={index} onIndexChange={setIndex} />
      )}
    </Card>
  )
}

function CurrentWeather({
  series,
  index,
  onIndexChange,
}: {
  series: NonNullable<WeatherForecast["timeSeries"]>
  index: number
  onIndexChange: (index: number) => void
}) {
  const { time, data } = series[index]
  const iconName = getWeatherIconName(data.symbol_code, isDaytime(time))
  const WeatherIcon = weatherIcons[iconName as keyof typeof weatherIcons] ?? Cloud

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-text-muted">Väder</span>
        <StepperButtons index={index} length={series.length} onIndexChange={onIndexChange} className="flex" />
      </div>
      <div className="mt-3 flex items-center gap-2 sm:gap-3">
        <WeatherIcon size={38} strokeWidth={1.5} className="shrink-0 text-accent sm:h-[42px] sm:w-[42px]" />
        <span className="font-display text-4xl font-semibold leading-none text-text sm:text-5xl">{data.air_temperature}°</span>
        <span className="ml-auto text-xs text-text-faint">
          {new Date(time).toLocaleString("sv-SE", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      <div className="mt-auto grid grid-cols-2 gap-x-5 gap-y-2 border-t border-border pt-3 text-xs">
        <Measurement label="Vind">{data.wind_speed} m/s</Measurement>
        <Measurement label="Fukt">{data.relative_humidity}%</Measurement>
        <Measurement label="Nederbörd">{data.precipitation_amount_mean} mm</Measurement>
        <Measurement label="Sikt">{data.visibility_in_air} km</Measurement>
      </div>
    </div>
  )
}
