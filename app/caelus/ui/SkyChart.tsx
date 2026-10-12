"use client"

import type { Body } from "astronomy-engine"
import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from "react"
import { AURORA_FOCUS_KEY, PLANET_FOCUS_KEY } from "./CaelusMenu"
import CultureSwitch from "./CultureSwitch"
import InfoPanel, { type PanelInfo } from "./InfoPanel"
import { SKY_CULTURES, SWEDISH_NAMES, type SkyCulture } from "./sky-cultures"
import { bodyInfo, figureInfo, starInfo, type SelectedStar, type StarDetails } from "./sky-info"
import { createPainter, type Painter } from "./sky/painter"
import { BODIES, buildScene } from "./sky/scene"
import type { Catalogue, Position } from "./sky/types"
import { prepareMilkyWay, type MilkyWayData } from "./sky/milky-way"
import { useGlidingTime } from "./sky/use-gliding-time"
import TimeControls from "./TimeControls"
import { useClock } from "./use-clock"
import { useLast } from "./use-last"
import { useStored } from "./use-stored"

const UPPSALA: Position = { latitude: 59.8586, longitude: 17.6389 }
const POSITION_KEY = "caelus-position"
const CULTURE_KEY = "caelus-culture"
// NOAA:s planetära Kp-index: en vecka bakåt (uppmätt och uppskattat) och tre dygn framåt
// (prognos), i treTimmarsperioder. Tidsangivelserna är i UTC utan tidszon.
const KP_URL = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json"
const KP_PERIOD = 3 * 60 * 60_000
type KpPeriod = { start: number; kp: number }

// Kp-värdet för perioden en tidpunkt ligger i, om den finns bland de hämtade.
function kpAt(periods: KpPeriod[], time: Date | null) {
	if (!time) return null
	const at = time.getTime()
	return periods.find(period => period.start <= at && at < period.start + KP_PERIOD)?.kp ?? null
}

// De statiska filerna i public/caelus/data/; proxy.ts skriver om sökvägen till /caelus/data/….
function load(url: string) {
	return fetch(url).then(response => (response.ok ? response.json() : Promise.reject()))
}

function parsePosition(stored: string | null): Position | null {
	try {
		const value = JSON.parse(stored ?? "null")
		return Number.isFinite(value?.latitude) && Number.isFinite(value?.longitude)
			? { latitude: value.latitude, longitude: value.longitude }
			: null
	} catch {
		return null
	}
}

function formatPosition({ latitude, longitude }: Position) {
	const degrees = (value: number) => Math.abs(value).toFixed(2).replace(".", ",")
	return `${degrees(latitude)}° ${latitude < 0 ? "S" : "N"}, ${degrees(longitude)}° ${longitude < 0 ? "V" : "O"}`
}

function twilight(sunAltitude: number) {
	if (sunAltitude > 0) return "Solen är uppe"
	if (sunAltitude > -18) return "Skymning"
	return "Mörkt"
}

/**
 * Stjärnkartan med sina reglage. Komponenten håller det som väljs (tid, plats, himmel, utpekad
 * figur och stjärna) och räknar fram himlen; ritandet och allt som rör sig sköter målaren i
 * sky/painter.ts.
 */
export default function SkyChart() {
	const wrapperRef = useRef<HTMLDivElement>(null)
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const painterRef = useRef<Painter | null>(null)

	const [catalogue, setCatalogue] = useState<Catalogue | null>(null)
	const [failed, setFailed] = useState(false)
	const now = useClock()
	// En tid man själv har valt; null betyder att kartan följer klockan.
	const [chosenTime, setChosenTime] = useState<Date | null>(null)
	// Medan tidslinjalen dras eller kalenderskivan vrids följer himlen handen direkt.
	const [scrubbing, setScrubbing] = useState(false)
	// Plats och himmel sparas i webbläsaren. Uppsala och svensk himmel gäller tills något valts.
	const [storedPosition, storePosition] = useStored(POSITION_KEY)
	const [storedCulture, storeCulture] = useStored(CULTURE_KEY)
	const position = useMemo(() => parsePosition(storedPosition) ?? UPPSALA, [storedPosition])
	const culture = SKY_CULTURES.find(item => item.id === storedCulture)?.id ?? "swedish"
	// Planetfokus väljs i menyn.
	const [storedFocus] = useStored(PLANET_FOCUS_KEY)
	const planetFocus = storedFocus === "on"
	const [storedAurora] = useStored(AURORA_FOCUS_KEY)
	const auroraFocus = storedAurora === "on"
	// Kp-index från NOAA, uppmätt och prognos i treTimmarsperioder; tomt tills det hämtats.
	const [kpPeriods, setKpPeriods] = useState<KpPeriod[]>([])
	// Vintergatans kontur, som hämtas för sig så att kartan inte väntar på den.
	const [milkyWayData, setMilkyWayData] = useState<MilkyWayData | null>(null)
	// Figuren som pekas ut eller är vald; dess namn står under kartan.
	const [focused, setFocused] = useState<string | null>(null)
	// Det som är framklickat och har sin panel öppen: en stjärna, en himlakropp eller en figur.
	// Bara en i taget.
	const [starIndex, setStarIndex] = useState<number | null>(null)
	const [chosenBody, setChosenBody] = useState<Body | null>(null)
	const [chosenFigure, setChosenFigure] = useState<string | null>(null)
	// Hämtas först när en stjärna öppnas.
	const [details, setDetails] = useState<StarDetails[] | null>(null)
	const detailsRequestedRef = useRef(false)
	const [locating, setLocating] = useState(false)
	const [locationError, setLocationError] = useState<string | null>(null)

	useEffect(() => {
		const painter = createPainter(canvasRef.current!, wrapperRef.current!, (turned, turning) => {
			setScrubbing(turning)
			setChosenTime(new Date(turned))
		})
		painterRef.current = painter
		return () => painter.destroy()
	}, [])

	useEffect(() => {
		painterRef.current?.setPlanetFocus(planetFocus)
	}, [planetFocus])

	useEffect(() => {
		painterRef.current?.setAuroraFocus(auroraFocus)
	}, [auroraFocus])

	// Kp hämtas när sidan öppnas och sedan en gång i timmen; ett misslyckat försök lämnar det
	// som redan finns, och kartan ritar då inget norrsken där värden saknas.
	useEffect(() => {
		const fetchKp = () =>
			fetch(KP_URL)
				.then(response => (response.ok ? response.json() : Promise.reject()))
				.then((rows: { time_tag: string; kp: number }[]) =>
					setKpPeriods(
						rows
							.filter(row => Number.isFinite(row.kp))
							.map(row => ({ start: Date.parse(`${row.time_tag}Z`), kp: row.kp })),
					),
				)
				.catch(() => {})
		fetchKp()
		const timer = setInterval(fetchKp, 60 * 60_000)
		return () => clearInterval(timer)
	}, [])

	useEffect(() => {
		Promise.all([load("/data/stars.json"), load("/data/constellations.json"), load("/data/norse.json")])
			.then(([stars, constellations, norse]) =>
				setCatalogue({ stars: stars.stars, constellations: constellations.constellations, norse }),
			)
			.catch(() => setFailed(true))
		// Utan konturen ritas kartan som förut, bara utan Vintergatan.
		load("/data/mw.json")
			.then(file => setMilkyWayData(prepareMilkyWay(file)))
			.catch(() => {})
	}, [])

	const time = chosenTime ?? now
	const shown = useGlidingTime(time, scrubbing)
	const kp = kpAt(kpPeriods, shown)
	const scene = useMemo(
		() => (shown ? buildScene(shown, position, culture, catalogue, kp, milkyWayData) : null),
		[shown, position, culture, catalogue, kp, milkyWayData],
	)
	useEffect(() => {
		if (scene) painterRef.current?.setScene(scene)
	}, [scene])

	const hover = (id: string | null) => {
		const painter = painterRef.current
		if (painter?.setHovered(id)) setFocused(id ?? painter.selected)
	}

	const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
		if (event.pointerType !== "mouse" || event.buttons !== 0) return
		hover(painterRef.current?.figureAt(event.nativeEvent.offsetX, event.nativeEvent.offsetY) ?? null)
	}

	const chooseStar = (index: number | null) => {
		painterRef.current?.setStar(index)
		setStarIndex(index)
		if (index !== null && !detailsRequestedRef.current) {
			detailsRequestedRef.current = true
			load("/data/star-details.json")
				.then((payload: { stars: StarDetails[] }) => setDetails(payload.stars))
				.catch(() => {
					// Panelen visar det kartan redan vet; nästa stjärna försöker hämta på nytt.
					detailsRequestedRef.current = false
				})
		}
	}

	const chooseFigure = (id: string | null) => {
		const painter = painterRef.current
		painter?.setSelected(id)
		setFocused(painter?.hovered ?? id)
		setChosenFigure(id)
	}

	// Stänger panelen, vad den än visar. En figur som var framklickad släpps också.
	const closePanel = () => {
		chooseStar(null)
		setChosenBody(null)
		if (chosenFigure !== null) chooseFigure(null)
	}

	const panelOpen = starIndex !== null || chosenBody !== null || chosenFigure !== null
	useEffect(() => {
		if (!panelOpen) return
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") closePanel()
		}
		document.addEventListener("keydown", onKeyDown)
		return () => document.removeEventListener("keydown", onKeyDown)
	})

	const onClick = (event: MouseEvent<HTMLCanvasElement>) => {
		const painter = painterRef.current
		if (!painter || painter.consumeTurn()) return
		const { offsetX, offsetY } = event.nativeEvent
		// Solen, månen och planeterna ligger överst och har företräde framför stjärnorna under dem.
		const body = painter.bodyAt(offsetX, offsetY)
		if (body !== null) {
			chooseStar(null)
			setChosenFigure(null)
			setChosenBody(body === chosenBody ? null : body)
			return
		}
		const star = painter.starAt(offsetX, offsetY)
		if (star !== null || painter.star !== null || chosenBody !== null) {
			// En stjärna öppnar sin panel; ett klick bredvid stänger den utan att välja något annat.
			setChosenBody(null)
			chooseStar(star === painter.star ? null : star)
			if (star !== null) setChosenFigure(null)
			return
		}
		const id = painter.figureAt(offsetX, offsetY)
		chooseFigure(id === painter.selected ? null : id)
	}

	const chooseCulture = (next: SkyCulture) => {
		if (next === culture) return
		painterRef.current?.changeFigures()
		setFocused(null)
		setChosenFigure(null)
		storeCulture(next)
	}

	const locate = () => {
		setLocationError(null)
		if (!navigator.geolocation) {
			setLocationError("Platstjänster stöds inte i den här webbläsaren.")
			return
		}
		setLocating(true)
		navigator.geolocation.getCurrentPosition(
			({ coords }) => {
				setLocating(false)
				storePosition(JSON.stringify({ latitude: coords.latitude, longitude: coords.longitude }))
			},
			() => {
				setLocating(false)
				setLocationError("Platsen kunde inte hämtas.")
			},
			{ timeout: 15000, maximumAge: 600_000 },
		)
	}

	// Det senaste namnet står kvar medan raden tonar ut.
	const focusedFigure = scene?.figures.find(figure => figure.id === focused) ?? null
	const caption = useLast(focusedFigure)

	const chosen = (starIndex !== null && scene?.starByIndex.get(starIndex)) || null
	const detail = (starIndex !== null && details?.[starIndex]) || null
	const selectedStar = useMemo((): SelectedStar | null => {
		if (!chosen) return null
		const home = catalogue?.constellations.find(item => item.id === chosen.constellation)
		const properName = catalogue?.stars[chosen.index]?.[6] ?? ""
		return {
			index: chosen.index,
			name: chosen.name || properName,
			alias: chosen.name && chosen.name !== properName ? properName : "",
			letter: chosen.letter,
			magnitude: chosen.magnitude,
			azimuth: chosen.at[0],
			altitude: chosen.at[1],
			constellation: home ? (culture === "latin" ? home.name : (SWEDISH_NAMES[home.id] ?? home.name)) : "",
			genitive: home?.genitive ?? "",
			details: detail,
		}
	}, [chosen, detail, catalogue, culture])

	const figure = (chosenFigure !== null && scene?.figures.find(item => item.id === chosenFigure)) || null
	const info = useMemo((): PanelInfo | null => {
		if (selectedStar) return starInfo(selectedStar)
		if (chosenBody !== null && time) {
			const name = BODIES.find(item => item.body === chosenBody)?.name ?? ""
			return bodyInfo(chosenBody, name, time, position)
		}
		if (figure) {
			const constellation =
				culture === "norse" ? undefined : catalogue?.constellations.find(item => item.id === figure.id)
			return figureInfo(figure, culture, catalogue, constellation)
		}
		return null
	}, [selectedStar, chosenBody, time, position, culture, figure, catalogue])

	return (
		<div className='flex min-h-0 flex-1 flex-col'>
			<div ref={wrapperRef} className='relative min-h-0 flex-1 overflow-hidden'>
				<canvas
					ref={canvasRef}
					role='img'
					aria-label='Stjärnhimlen. Dra för att se dig omkring, zooma för att komma närmare, klicka på en stjärnbild, stjärna, planet, solen eller månen för att få veta mer om den.'
					onPointerMove={onPointerMove}
					onPointerLeave={() => hover(null)}
					onClick={onClick}
					className='absolute inset-0 size-full cursor-grab touch-none text-text active:cursor-grabbing'
				/>
				<CultureSwitch culture={culture} onChange={chooseCulture} />
				<p
					aria-hidden={catalogue !== null || failed}
					className={`pointer-events-none absolute inset-x-0 top-1/3 text-center text-lg italic text-text-muted transition-opacity duration-700 motion-reduce:transition-none ${
						catalogue === null && !failed ? "opacity-100" : "opacity-0"
					}`}>
					Väntar på mörkret …
				</p>
				{/* Namnet ligger över kartans nederkant, så att kartan får hela höjden ner till
				    tidsraden och inte ändrar storlek när ett namn kommer och går. */}
				<p
					aria-live='polite'
					className={`pointer-events-none absolute inset-x-0 bottom-1 truncate px-4 text-center text-md text-text transition-opacity duration-300 motion-reduce:transition-none ${
						focusedFigure ? "opacity-100" : "opacity-0"
					}`}>
					{caption && (
						// Ny nyckel per figur: ett nytt namn tonar in i stället för att bytas rakt av.
						<span
							key={caption.id}
							className='bg-bg px-4 py-1 transition-opacity duration-300 motion-reduce:transition-none starting:opacity-0'>
							{caption.name}
							{caption.gloss && caption.gloss !== caption.name && (
								<span className='italic text-text-muted'> · {caption.gloss}</span>
							)}
						</span>
					)}
				</p>
				<InfoPanel info={info} onClose={closePanel} />
				{failed && (
					<p className='absolute inset-0 flex items-center justify-center p-8 text-center text-base italic text-text-muted'>
						Stjärnkatalogen kunde inte läsas in.
					</p>
				)}
			</div>
			<TimeControls
				time={time}
				live={chosenTime === null}
				onChange={setChosenTime}
				onScrub={setScrubbing}>
				{scene && (
					<span className='text-xs'>
						<span className='italic'>{twilight(scene.sunAltitude)}</span> · {formatPosition(position)}
					</span>
				)}
				<button
					type='button'
					onClick={locate}
					disabled={locating}
					className='cursor-pointer text-xs uppercase tracking-[0.16em] transition-colors duration-200 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring disabled:cursor-default disabled:opacity-60 motion-reduce:transition-none'>
					{locating ? "Hämtar plats …" : "Min plats"}
				</button>
				{locationError && (
					<span role='alert' className='text-xs'>
						{locationError}
					</span>
				)}
			</TimeControls>
		</div>
	)
}
