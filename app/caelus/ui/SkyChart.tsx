"use client"

import type { Body } from "astronomy-engine"
import type { MeteorShower } from "@/app/lib/dal/caelus"
import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from "react"
import { EVENTS_KEY, QUIZ_KEY, TONIGHT_KEY } from "./CaelusMenu"
import { AURORA_FOCUS_KEY, CLOUDS_KEY, DEEP_SKY_FOCUS_KEY, METEORS_KEY, PLANET_FOCUS_KEY } from "./LayerMenu"
import { useDarkMode } from "./CaelusTheme"
import CultureSwitch from "./CultureSwitch"
import EventsPanel from "./EventsPanel"
import InfoPanel, { type PanelInfo } from "./InfoPanel"
import { answerQuiz, createQuiz, nextQuestion, quizConstellations, selectionPool, type Quiz, type QuizSelection } from "./quiz"
import QuizPanel from "./QuizPanel"
import SkySearch, { type Sought } from "./SkySearch"
import { SKY_CULTURES, SWEDISH_NAMES, type SkyCulture } from "./sky-cultures"
import { bodyInfo, deepSkyInfo, figureInfo, starInfo, type SelectedStar, type StarDetails } from "./sky-info"
import type { DeepSkyRow } from "./sky/deep-sky"
import { cloudCoverAt, describeCloudCover, fetchCloudCover, type CloudStep } from "./sky/clouds"
import { darknessAt, darknessInfo } from "./sky/darkness"
import { tonightAt } from "./sky/tonight"
import TonightPanel from "./TonightPanel"
import { onDeviceDirection, stopFollowing, useFollowing } from "./sky/compass"
import { eventsAround, sameDay } from "./sky/events"
import { createPainter, type Painter } from "./sky/painter"
import { BODIES, buildScene } from "./sky/scene"
import type { Catalogue, Position, Scene } from "./sky/types"
import { prepareMilkyWay, type MilkyWayData } from "./sky/milky-way"
import { useGlidingTime } from "./sky/use-gliding-time"
import TimeControls from "./TimeControls"
import { useClock } from "./use-clock"
import { useLast } from "./use-last"
import { useStored } from "@/app/lib/use-stored"

export const UPPSALA: Position = { latitude: 59.8586, longitude: 17.6389 }
export const POSITION_KEY = "caelus-position"
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

export function parsePosition(stored: string | null): Position | null {
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

// Var det sökta står på himlen och vad det heter. Ormen är två figurer; den som står högst gäller.
function soughtPoint(scene: Scene, sought: Sought) {
	if (sought.kind === "body") {
		const body = scene.allBodies.find(item => item.body === sought.body)
		return body ? { at: body.at, name: body.name } : null
	}
	const figure = scene.figures.filter(item => item.id === sought.id).sort((a, b) => b.at[1] - a.at[1])[0]
	return figure ? { at: figure.at, name: figure.name } : null
}

/**
 * Stjärnkartan med sina reglage. Komponenten håller det som väljs (tid, plats, himmel, utpekad
 * figur och stjärna) och räknar fram himlen; ritandet och allt som rör sig sköter målaren i
 * sky/painter.ts.
 */
export default function SkyChart({ meteorShowers }: { meteorShowers: MeteorShower[] }) {
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
	const [storedDeepSky] = useStored(DEEP_SKY_FOCUS_KEY)
	const deepSkyFocus = storedDeepSky === "on"
	// Galaxerna och nebulosorna, som hämtas för sig så att kartan inte väntar på dem.
	const [deepSkyRows, setDeepSkyRows] = useState<DeepSkyRow[]>([])
	// Kp-index från NOAA, uppmätt och prognos i treTimmarsperioder; tomt tills det hämtats.
	const [kpPeriods, setKpPeriods] = useState<KpPeriod[]>([])
	// Molnen slås av och på i menyn. Prognosen kommer från SMHI och gäller platsen; tom tills den
	// hämtats och utanför prognosområdet.
	const [storedClouds] = useStored(CLOUDS_KEY)
	const clouds = storedClouds !== "off"
	const [cloudSteps, setCloudSteps] = useState<CloudStep[]>([])
	const [storedMeteors] = useStored(METEORS_KEY)
	const meteors = storedMeteors !== "off"
	// Vintergatans kontur, som hämtas för sig så att kartan inte väntar på den.
	const [milkyWayData, setMilkyWayData] = useState<MilkyWayData | null>(null)
	// Figuren som pekas ut eller är vald; dess namn står under kartan.
	const [focused, setFocused] = useState<string | null>(null)
	// Det som är framklickat och har sin panel öppen: en stjärna, en himlakropp eller en figur.
	// Bara en i taget.
	const [starIndex, setStarIndex] = useState<number | null>(null)
	const [chosenBody, setChosenBody] = useState<Body | null>(null)
	const [chosenFigure, setChosenFigure] = useState<string | null>(null)
	const [chosenDeepSky, setChosenDeepSky] = useState<number | null>(null)
	// Hämtas först när en stjärna öppnas.
	const [details, setDetails] = useState<StarDetails[] | null>(null)
	const detailsRequestedRef = useRef(false)
	// Händelsepanelen, som fälls ut från menyn.
	const [storedEvents, storeEvents] = useStored(EVENTS_KEY)
	const eventsOpen = storedEvents === "open"
	const setEventsOpen = (open: boolean) => storeEvents(open ? "open" : "closed")
	// I kväll, som öppnas från menyn och ligger på händelsepanelens plats.
	const [storedTonight, storeTonight] = useStored(TONIGHT_KEY)
	const tonightOpen = storedTonight === "open"
	// Quizet, som öppnas från menyn. Det börjar om med valet av urval varje gång det öppnas.
	const [storedQuiz, storeQuiz] = useStored(QUIZ_KEY)
	const quizOpen = storedQuiz === "open"
	const [quiz, setQuiz] = useState<Quiz | null>(null)
	const [quizWasOpen, setQuizWasOpen] = useState(quizOpen)
	if (quizOpen !== quizWasOpen) {
		setQuizWasOpen(quizOpen)
		setQuiz(null)
	}
	const question = quizOpen && quiz && quiz.index < quiz.questions.length ? quiz.questions[quiz.index] : null
	const given = question && quiz ? (quiz.answers[quiz.index] ?? null) : null
	// När en stjärnbild ska pekas ut tar kartan emot svaret, utan figurernas namn.
	const pointing = question?.mode === "point"
	// Quizet frågar efter IAU:s stjärnbilder, så den nordiska himlen byts mot den svenska under tiden.
	const skyCulture = quizOpen && culture === "norse" ? "swedish" : culture
	// Kvällens förutsättningar, som öppnas från betyget i tidsraden. De visas i infopanelen och
	// stängs när något på kartan klickas fram.
	const [darknessOpen, setDarknessOpen] = useState(false)
	const hasSelection = starIndex !== null || chosenBody !== null || chosenFigure !== null || chosenDeepSky !== null
	const [hadSelection, setHadSelection] = useState(hasSelection)
	if (hasSelection !== hadSelection) {
		setHadSelection(hasSelection)
		if (hasSelection) setDarknessOpen(false)
	}
	const [locating, setLocating] = useState(false)
	const [locationError, setLocationError] = useState<string | null>(null)
	// Om blicken följer telefonen slås av och på i menyn; felet står under kartan.
	const { on: following, error: followError } = useFollowing()
	// Det som sökts fram. Det gäller så länge det är framklickat; väljs något annat släpps det.
	const [sought, setSought] = useState<Sought | null>(null)

	useEffect(() => {
		const unsubscribe = onDeviceDirection(direction => painterRef.current?.follow(direction))
		// Givarna släpps när kartan lämnas.
		return () => {
			unsubscribe()
			stopFollowing()
		}
	}, [])

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

	useEffect(() => {
		painterRef.current?.setDeepSkyFocus(deepSkyFocus)
	}, [deepSkyFocus])

	useEffect(() => {
		painterRef.current?.setDeepSky(chosenDeepSky)
	}, [chosenDeepSky])

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
		painterRef.current?.setClouds(clouds)
	}, [clouds])

	useEffect(() => {
		painterRef.current?.setMeteors(meteors)
	}, [meteors])

	// Kartan läser färgerna från temat när den ritar, så den ritas om när läget byts.
	const dark = useDarkMode()
	useEffect(() => {
		painterRef.current?.redraw()
	}, [dark])

	// Molnprognosen hämtas för platsen och sedan en gång i timmen, så ofta SMHI gör en ny. Ett
	// misslyckat försök lämnar den som redan finns.
	useEffect(() => {
		let current = true
		const fetchClouds = () =>
			fetchCloudCover(position)
				.then(steps => {
					if (current) setCloudSteps(steps)
				})
				.catch(() => {})
		fetchClouds()
		const timer = setInterval(fetchClouds, 60 * 60_000)
		return () => {
			current = false
			clearInterval(timer)
		}
	}, [position])

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
		// Likaså utan galaxerna och nebulosorna.
		load("/data/deep-sky.json")
			.then((rows: DeepSkyRow[]) => setDeepSkyRows(rows))
			.catch(() => {})
	}, [])

	const time = chosenTime ?? now
	const shown = useGlidingTime(time, scrubbing)
	const kp = kpAt(kpPeriods, shown)
	const cloudCover = cloudCoverAt(cloudSteps, shown)
	const scene = useMemo(
		() =>
			shown
				? buildScene(shown, position, skyCulture, catalogue, kp, milkyWayData, cloudCover, meteorShowers, deepSkyRows)
				: null,
		[shown, position, skyCulture, catalogue, kp, milkyWayData, cloudCover, meteorShowers, deepSkyRows],
	)
	// Byts himlen när quizet öppnas eller stängs tonar de gamla figurerna ut, som när man väljer
	// himmel. Det måste ske innan målaren får den nya himlen.
	const shownCultureRef = useRef(skyCulture)
	useEffect(() => {
		if (shownCultureRef.current === skyCulture) return
		shownCultureRef.current = skyCulture
		painterRef.current?.changeFigures()
	}, [skyCulture])
	useEffect(() => {
		if (scene) painterRef.current?.setScene(scene)
	}, [scene])

	// Medan en stjärnbild ska pekas ut står inga namn på figurerna, och teckningen visas först
	// när man pekat rätt.
	useEffect(() => {
		painterRef.current?.setFigureNames(!pointing)
		painterRef.current?.setArtShown(!pointing || (given !== null && given === question?.id))
	}, [pointing, given, question])

	const hover = (id: string | null) => {
		const painter = painterRef.current
		if (painter?.setHovered(id)) setFocused(id ?? painter.selected)
	}

	const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
		// En stjärnbild som lyfts fram under pekaren skulle avslöja svaret.
		if (pointing || event.pointerType !== "mouse" || event.buttons !== 0) return
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
		setDarknessOpen(false)
		chooseStar(null)
		setChosenBody(null)
		setChosenDeepSky(null)
		if (chosenFigure !== null) chooseFigure(null)
	}

	// Det sökta gäller bara medan det är framklickat och quizet är stängt.
	const activeSought =
		sought && !quizOpen &&
		((sought.kind === "body" && chosenBody === sought.body) || (sought.kind === "figure" && chosenFigure === sought.id))
			? sought
			: null
	const soughtTarget = useMemo(() => (scene && activeSought ? soughtPoint(scene, activeSought) : null), [scene, activeSought])

	// Det som sökts fram klickas fram, med sin panel, och blicken glider dit. Följer blicken
	// telefonen visar målaren i stället vägen dit.
	const seek = (target: Sought) => {
		const painter = painterRef.current
		if (!painter || !scene) return
		if (eventsOpen) setEventsOpen(false)
		if (tonightOpen) storeTonight("closed")
		chooseStar(null)
		setChosenDeepSky(null)
		if (target.kind === "body") {
			if (chosenFigure !== null) chooseFigure(null)
			setChosenBody(target.body)
		} else {
			setChosenBody(null)
			chooseFigure(target.id)
		}
		setSought(target)
		const point = soughtPoint(scene, target)
		if (point) painter.lookAt(point.at)
	}

	useEffect(() => {
		painterRef.current?.guide(soughtTarget)
	}, [soughtTarget])

	// När telefonen släpps glider blicken till det sökta, som när det söktes fram utan telefonen.
	const followedRef = useRef(following)
	useEffect(() => {
		const was = followedRef.current
		followedRef.current = following
		if (was && !following && soughtTarget) painterRef.current?.lookAt(soughtTarget.at)
	}, [following, soughtTarget])

	// Stjärnbilderna quizet frågar efter, och hur högt var och en står just nu.
	const quizzed = useMemo(() => quizConstellations(catalogue?.constellations ?? []), [catalogue])
	const quizzedById = useMemo(() => new Map(quizzed.map(item => [item.id, item])), [quizzed])
	const heights = useMemo(() => {
		const result = new Map<string, number>()
		for (const figure of scene?.figures ?? []) result.set(figure.id, Math.max(result.get(figure.id) ?? -90, figure.at[1]))
		return result
	}, [scene])

	const startQuiz = (selection: QuizSelection, count: number) => {
		chooseFigure(null)
		setQuiz(createQuiz(selection, count, selectionPool(selection, quizzed, position, heights), heights))
	}
	const nextInQuiz = () => {
		chooseFigure(null)
		setQuiz(current => current && nextQuestion(current))
	}
	const restartQuiz = () => {
		chooseFigure(null)
		setQuiz(null)
	}
	const closeQuiz = () => {
		chooseFigure(null)
		storeQuiz("closed")
	}
	// En miss i resultatet visas på kartan, med panelen om stjärnbilden.
	const showMiss = (id: string) => {
		storeQuiz("closed")
		chooseFigure(id)
	}

	useEffect(() => {
		if (!quizOpen) return
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") closeQuiz()
		}
		document.addEventListener("keydown", onKeyDown)
		return () => document.removeEventListener("keydown", onKeyDown)
	})

	const panelOpen = !quizOpen && (darknessOpen || hasSelection)
	useEffect(() => {
		if (!panelOpen) return
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") closePanel()
		}
		document.addEventListener("keydown", onKeyDown)
		return () => document.removeEventListener("keydown", onKeyDown)
	})

	// Om det senaste trycket på kartan var ett finger, en penna eller en mus.
	const pointerTypeRef = useRef("mouse")

	const onClick = (event: MouseEvent<HTMLCanvasElement>) => {
		const painter = painterRef.current
		if (!painter || painter.consumeTurn()) return
		// Med quizet öppet väljer kartan ingenting; ett klick är bara ett svar när en stjärnbild ska
		// pekas ut. Ett klick utanför stjärnbilderna, som på marken, räknas inte.
		if (quizOpen) {
			if (question?.mode !== "point" || given !== null) return
			const id = painter.figureAt(event.nativeEvent.offsetX, event.nativeEvent.offsetY)
			if (id === null) return
			setQuiz(current => current && answerQuiz(current, id))
			// Den rätta stjärnbilden lyfts fram, så att man ser var den låg, och vid fel svar glider
			// blicken dit. Ormen är två figurer; blicken går till den som står högst.
			chooseFigure(question.id)
			if (id !== question.id) {
				const target = scene?.figures
					.filter(figure => figure.id === question.id)
					.sort((a, b) => b.at[1] - a.at[1])[0]
				if (target) painter.lookAt(target.at)
			}
			return
		}
		// Händelsepanelen, I kväll och panelen om det som klickas fram ligger på samma ställe på en
		// telefon.
		if (eventsOpen) setEventsOpen(false)
		if (tonightOpen) storeTonight("closed")
		const { offsetX, offsetY } = event.nativeEvent
		// En framklickad galax eller nebulosa släpps av varje klick; klickas den igen stängs den.
		const wasDeepSky = chosenDeepSky
		setChosenDeepSky(null)
		// Solen, månen och planeterna ligger överst och har företräde framför stjärnorna under dem.
		const body = painter.bodyAt(offsetX, offsetY)
		if (body !== null) {
			chooseStar(null)
			setChosenFigure(null)
			setChosenBody(body === chosenBody ? null : body)
			return
		}
		// Därefter galaxerna och nebulosorna, som är större än stjärnorna i dem.
		const deepSky = painter.deepSkyAt(offsetX, offsetY)
		if (deepSky !== null) {
			chooseStar(null)
			setChosenBody(null)
			if (chosenFigure !== null) chooseFigure(null)
			setChosenDeepSky(deepSky === wasDeepSky ? null : deepSky)
			return
		}
		// Med fingret finns ingen pekare som lyfter fram en stjärnbild, och ett finger träffar
		// nästan alltid någon stjärna. Första trycket på en stjärnbild väljer den därför, med bild
		// och panel; först inom en vald stjärnbild öppnar ett tryck på en stjärna stjärnan.
		const id = painter.figureAt(offsetX, offsetY)
		if (pointerTypeRef.current === "touch" && id !== null && id !== painter.selected) {
			chooseStar(null)
			setChosenBody(null)
			chooseFigure(id)
			return
		}
		const star = painter.starAt(offsetX, offsetY)
		if (star !== null || painter.star !== null || chosenBody !== null || wasDeepSky !== null) {
			// En stjärna öppnar sin panel; ett klick bredvid stänger den utan att välja något annat.
			setChosenBody(null)
			chooseStar(star === painter.star ? null : star)
			if (star !== null) setChosenFigure(null)
			return
		}
		chooseFigure(id === painter.selected ? null : id)
	}

	const chooseCulture = (next: SkyCulture) => {
		if (next === culture) return
		painterRef.current?.changeFigures()
		setFocused(null)
		setChosenFigure(null)
		storeCulture(next)
	}

	// `opening` när kartan själv frågar efter platsen när sidan öppnas: säger man nej till
	// webbläsarens fråga gäller den sparade platsen, utan något fel under kartan.
	const locate = (opening = false) => {
		setLocationError(null)
		if (!navigator.geolocation) {
			if (!opening) setLocationError("Platstjänster stöds inte i den här webbläsaren.")
			return
		}
		setLocating(true)
		navigator.geolocation.getCurrentPosition(
			({ coords }) => {
				setLocating(false)
				storePosition(JSON.stringify({ latitude: coords.latitude, longitude: coords.longitude }))
			},
			error => {
				setLocating(false)
				if (opening && error.code === error.PERMISSION_DENIED) return
				setLocationError(
					error.code === error.PERMISSION_DENIED
						? "Platsen är blockerad i webbläsaren."
						: "Platsen kunde inte hämtas.",
				)
			},
			{ timeout: 15000, maximumAge: 600_000 },
		)
	}

	// Kartan frågar efter aktuell plats när sidan öppnas, en gång.
	const openedRef = useRef(false)
	useEffect(() => {
		if (openedRef.current) return
		openedRef.current = true
		locate(true)
	})

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

	const darkness = useMemo(() => (scene && shown ? darknessAt(scene, shown) : null), [scene, shown])
	const toggleDarkness = () => {
		if (darknessOpen) {
			setDarknessOpen(false)
			return
		}
		closePanel()
		if (eventsOpen) setEventsOpen(false)
		if (tonightOpen) storeTonight("closed")
		setDarknessOpen(true)
	}

	const figure = (chosenFigure !== null && scene?.figures.find(item => item.id === chosenFigure)) || null
	const deepSkyObject = (chosenDeepSky !== null && scene?.deepSky.find(item => item.index === chosenDeepSky)) || null
	const info = useMemo((): PanelInfo | null => {
		if (darknessOpen && darkness && shown) return darknessInfo(darkness, shown, cloudSteps.length > 0)
		if (selectedStar) return starInfo(selectedStar)
		if (deepSkyObject) {
			const home = scene?.figureAt?.(deepSkyObject.at)
			return deepSkyInfo(deepSkyObject, scene?.figures.find(item => item.id === home)?.name ?? "")
		}
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
	}, [darknessOpen, darkness, shown, cloudSteps, selectedStar, deepSkyObject, scene, chosenBody, time, position, culture, figure, catalogue])

	// Händelserna räknas ut per år och plats; panelen visar dem kring kartans tid.
	const year = time?.getFullYear() ?? null
	const events = useMemo(() => (year === null ? [] : eventsAround(new Date(year, 0, 1), position, meteorShowers)),
		[year, position, meteorShowers],
	)
	const todaysEvents = time ? events.filter(event => sameDay(event.time, time.getTime())) : []
	const comingEvents = time
		? events.filter(event => event.time > time.getTime() && !sameDay(event.time, time.getTime())).slice(0, 8)
		: []

	useEffect(() => {
		if (!eventsOpen) return
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") storeEvents("closed")
		}
		document.addEventListener("keydown", onKeyDown)
		return () => document.removeEventListener("keydown", onKeyDown)
	}, [eventsOpen, storeEvents])

	// Natten räknas bara medan I kväll är öppet, och på kartans tid, inte under glidningen dit.
	const tonight = useMemo(
		() => (tonightOpen && time ? tonightAt(time, position, cloudSteps, kpPeriods, meteorShowers) : null),
		[tonightOpen, time, position, cloudSteps, kpPeriods, meteorShowers],
	)

	useEffect(() => {
		if (!tonightOpen) return
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") storeTonight("closed")
		}
		document.addEventListener("keydown", onKeyDown)
		return () => document.removeEventListener("keydown", onKeyDown)
	}, [tonightOpen, storeTonight])

	return (
		<div className='flex min-h-0 flex-1 flex-col'>
			<div ref={wrapperRef} className='relative min-h-0 flex-1 overflow-hidden'>
				<canvas
					ref={canvasRef}
					role='img'
					aria-label='Stjärnhimlen. Dra för att se dig omkring, zooma för att komma närmare, klicka på en stjärnbild, stjärna, galax, nebulosa, planet, solen eller månen för att få veta mer om den.'
					onPointerDown={event => {
						pointerTypeRef.current = event.pointerType
					}}
					onPointerMove={onPointerMove}
					onPointerLeave={() => hover(null)}
					onClick={onClick}
					className='absolute inset-0 size-full cursor-grab touch-none text-text active:cursor-grabbing'
				/>
				{/* Quizet har alltid svenska namn, så valet av himmel göms medan det är öppet. */}
				{!quizOpen && <CultureSwitch culture={culture} onChange={chooseCulture} />}
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
				{/* Sökknappen står under menyknappen. Den göms medan quizet är öppet, eftersom
				    sökningen skulle avslöja svaren. */}
				{!quizOpen && <SkySearch scene={scene} onChoose={seek} />}
				{/* Medan händelsepanelen eller quizet är öppet får det platsen för sig. */}
				<InfoPanel info={eventsOpen || quizOpen || tonightOpen ? null : info} onClose={closePanel} />
				{quizOpen && catalogue && (
					<QuizPanel
						quiz={quiz}
						constellations={quizzedById}
						stars={catalogue.stars}
						onStart={startQuiz}
						onAnswer={id => setQuiz(current => current && answerQuiz(current, id))}
						onNext={nextInQuiz}
						onRestart={restartQuiz}
						onShow={showMiss}
						onClose={closeQuiz}
					/>
				)}
				<EventsPanel
					open={eventsOpen}
					today={todaysEvents}
					showers={scene?.showers ?? []}
					coming={comingEvents}
					position={position}
					onChoose={chosen => setChosenTime(new Date(chosen))}
					onClose={() => setEventsOpen(false)}
				/>
				<TonightPanel
					open={tonightOpen}
					tonight={tonight}
					hasForecast={cloudSteps.length > 0}
					onChoose={chosen => setChosenTime(new Date(chosen))}
					onClose={() => storeTonight("closed")}
				/>
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
				{scene && darkness && (
					<span className='text-center text-xs'>
						{/* Betyget öppnar förutsättningarna i infopanelen. Medan quizet har den platsen
						    är det bara text. */}
						{quizOpen ? (
							<span className='italic'>{darkness.verdict}</span>
						) : (
							<button
								type='button'
								aria-expanded={darknessOpen && !eventsOpen && !tonightOpen}
								onClick={toggleDarkness}
								className='cursor-pointer italic text-text underline-offset-4 hover:underline aria-expanded:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring'>
								{darkness.verdict}
							</button>
						)}
						{scene.cloudCover !== null && ` · ${describeCloudCover(scene.cloudCover)}`}{" "}
						{/* Punkten följer med positionen, så att ingen punkt blir hängande när raden bryts. */}
						<span className='whitespace-nowrap'>· {formatPosition(position)}</span>
					</span>
				)}
				<button
					type='button'
					onClick={() => locate()}
					disabled={locating}
					className='cursor-pointer text-xs uppercase tracking-[0.16em] transition-colors duration-200 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring disabled:cursor-default disabled:opacity-60 motion-reduce:transition-none'>
					{locating ? "Hämtar plats …" : "Min plats"}
				</button>
				{locationError && (
					<span role='alert' className='text-xs'>
						{locationError}
					</span>
				)}
				{followError && (
					<span role='alert' className='text-xs'>
						{followError}
					</span>
				)}
			</TimeControls>
		</div>
	)
}
