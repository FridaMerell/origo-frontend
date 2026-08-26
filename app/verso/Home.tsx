'use client'
import { useEffect, useState } from "react"
import { Facility } from "../lib/dal"
import { useFacilities } from "../lib/facility-context"
import { Card } from "../components/ui/Card"
import { getWeather } from "../lib/weather-client"
import { Icon } from "../components/ui/Icon"
import { ArrowLeft, ArrowLeftRight, ArrowRight, CalendarIcon } from "lucide-react"
import { useBookingData } from "../lib/booking-context"
import { BookVisitButton } from "./besok/book-visit-button"
import { useUpdateData } from "../lib/update-context"
import { useUsers, getUserLabel } from "../lib/user-context"
import { ListTable } from "../components/ui/ListTable"
import { Avatar } from "../components/ui/Avatar"
import { Drawer } from "../components/ui/Drawer"
import UpdateForm from "./update-form"
import { formatDateShort } from "../lib/format-date"

const WeatherWidget = ({ facility }: { facility: Facility }) => {
  const [weather, setWeather] = useState<any>(null)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    getWeather(facility).then((data) => {
      setWeather(data)
    })
  }, [facility])

  const getWeatherIcon = () => {
    /**
     * Value	Meaning
        1	Clear sky
        2	Nearly clear sky
        3	Variable cloudiness
        4	Halfclear sky
        5	Cloudy sky
        6	Overcast
        7	Fog
        8	Light rain showers
        9	Moderate rain showers
        10	Heavy rain showers
        11	Thunderstorm
        12	Light sleet showers
        13	Moderate sleet showers
        14	Heavy sleet showers
        15	Light snow showers
        16	Moderate snow showers
        17	Heavy snow showers
        18	Light rain
        19	Moderate rain
        20	Heavy rain
        21	Thunder
        22	Light sleet
        23	Moderate sleet
        24	Heavy sleet
        25	Light snowfall
        26	Moderate snowfall
        27	Heavy snowfall
     */

    if (!weather || !weather.timeSeries || weather.timeSeries.length === 0) {
      return null
    }

    const symbolCode = weather.timeSeries[index].data.symbol_code

    const daytime = (new Date(weather.timeSeries[index].time)).getHours() >= 6 && (new Date(weather.timeSeries[index].time)).getHours() < 18

    // match to lucide-react icons
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

  return <Card className="p-4 w-full col-span-6 md:col-span-2 lg:col-span-2">
    {weather ? (
      weather.timeSeries && weather.timeSeries.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 font-display text-accent">
              <span className={'pt'}>

                <Icon name={getWeatherIcon() || "cloud"} size={34} />
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

          <div className="flex gap-1 justify-between">
            <button
              type="button"
              onClick={() => setIndex(Math.max(0, index - 1))}
              disabled={index === 0}
              className="rounded bg-accent-wash px-2 py-1 text-sm text-accent hover:bg-accent-active hover:text-accent-contrast disabled:opacity-50 disabled:hover:bg-accent-wash disabled:hover:text-accent"
            >
              <ArrowLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setIndex(Math.min(weather.timeSeries.length - 1, index + 1))}
              disabled={index === weather.timeSeries.length - 1}
              className="rounded bg-accent-wash px-2 py-1 text-sm text-accent hover:bg-accent-active hover:text-accent-contrast disabled:opacity-50 disabled:hover:bg-accent-wash disabled:hover:text-accent"
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center text-text-muted">Ingen väderdata tillgänglig.</div>
      )
    ) : (
      <div className="text-center text-text-muted">Hämtar väderdata...</div>
    )}
  </Card>
}

const NextVisitWidget = ({ facility }: { facility: Facility }) => {
  const { bookings } = useBookingData()
  const [index, setIndex] = useState(0)
  return <Card className="w-full col-span-6 md:col-span-4 lg:col-span-4 flex flex-col justify-between">
    {
      bookings && bookings.length > 0 ? (

        <div className="flex flex-col gap-2">
          <span className="text-text-faint text-xs ">
            <CalendarIcon size={13} className="inline-block mr-1" />
            Nästa besök
          </span>
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-display font-bold">{bookings[index].visitor}</span>
            <span className="text-sm text-text-muted">{formatDateShort(bookings[index].start_date)} - {formatDateShort(bookings[index].end_date)}</span>
          </div>
        </div>
      ) : (
        <div className="text-center text-text-muted">Inga kommande besök.</div>
      )
    }

    <div className="flex gap-1 justify-between mt-2">
      <button
        type="button"
        onClick={() => setIndex(Math.max(0, index - 1))}
        disabled={index === 0}
        className="rounded bg-accent-wash px-2 py-1 text-sm text-accent hover:bg-accent-active hover:text-accent-contrast disabled:opacity-50 disabled:hover:bg-accent-wash disabled:hover:text-accent"
      >
        <ArrowLeft size={16} />
      </button>
      <button
        type="button"
        onClick={() => setIndex(Math.min(bookings.length - 1, index + 1))}
        disabled={index === bookings.length - 1}
        className="rounded bg-accent-wash px-2 py-1 text-sm text-accent hover:bg-accent-active hover:text-accent-contrast disabled:opacity-50 disabled:hover:bg-accent-wash disabled:hover:text-accent"
      >
        <ArrowRight size={16} />
      </button>
    </div>
  </Card>
}

const UpdatesWidget = () => {
  const { updates } = useUpdateData()
  const users = useUsers()
  return <Card className="w-full col-span-6 md:col-span-3 lg:col-span-3 gap-5 flex flex-col justify-between">
    {updates && updates.length > 0 ?
      (
        <ListTable
          showHeader={false}
          caption={'Nyligen uppdaterat'}
          columns={[{
            key: "entry", render: (e) => (
              <div className="flex items-center gap-3">
                <Avatar name={getUserLabel(users, e.author)} size={28} />
                <div className="flex flex-col">
                  <span>{e.title}</span>
                  <span className="text-xs text-text-faint">Skickat av {getUserLabel(users, e.author)}</span>
                </div>
              </div>
            )
          }]}
          rows={updates.map((e) => ({ id: e.id, item: e }))}
        />
      )
      : (
        <div className="mb-5 text-text-muted">Inga uppdateringar.</div>
      )
    }
    <div>

    </div>
  </Card>
}

const ResentExpensesWidget = () => {
  const { selectedFacility, yearlyExpenses } = useFacilities()
  return yearlyExpenses ? (
    <Card className="w-full col-span-6 md:col-span-3 lg:col-span-3 gap-5 flex flex-col justify-between">
      <div className="flex flex-col gap-2">
        <span className="text-text-faint text-xs ">
          <Icon name="credit-card" size={13} className="inline-block mr-1" />
          Utgifter i år
        </span>
        <div className="flex flex-col gap-1">
          <span className="text-2xl font-display font-bold">{yearlyExpenses} kr</span>
        </div>
      </div>
    </Card>
  ) : (
    <Card className="w-full col-span-6 md:col-span-3 lg:col-span-3 gap-5 flex flex-col justify-between">
      <div className="mb-5 text-text-muted">Inga utgifter.</div>
    </Card>
  )
}

const Home = () => {
  const { selectedFacility } = useFacilities()
  const { updates } = useUpdateData()
  if (!selectedFacility) {
    return (
      <div className="flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Välkommen till Origo</h1>
        <p className="text-lg text-gray-600">Vänligen välj en anläggning för att fortsätta.</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-4 px-10 py-5">
      <div className="w-full flex items-center justify-between gap-4">
        <h1 className="text-2xl font-display">Dashboard för {selectedFacility.name}</h1>
        <div className="flex gap-2">
          <Drawer trigger="Lägg till uppdatering" triggerVariant={"secondary"} triggerSize={'sm'} title={'Ny uppdatering'} >
            <UpdateForm />
          </Drawer>
          <BookVisitButton />
        </div>
      </div>
      <div className="grid grid-cols-6 gap-4">
        <NextVisitWidget facility={selectedFacility} />
        <WeatherWidget facility={selectedFacility} />
        <UpdatesWidget />
        <ResentExpensesWidget />
      </div>
    </div>
  )
}


export default Home