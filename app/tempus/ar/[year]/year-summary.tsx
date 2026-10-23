"use client"

import Link from "next/link"
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react"
import { Lightbox } from "@/app/components/ui/Gallery"
import type { TempusYearPhoto, TempusYearSpecies, TempusYearSummary } from "@/app/lib/dal/tempus/observations"
import { fileProxyUrl } from "@/app/lib/files"
import { thumbnailPath } from "@/app/tempus/observationer/observation-photos"
import { Compass } from "@/app/tempus/ui/atlas-map/Compass"
import { BiotopeMap } from "@/app/tempus/ui/biotope-map/BiotopeMap"
import { SwedenMap } from "@/app/tempus/ui/biotope-map/SwedenMap"
import { createProjection } from "@/app/tempus/ui/biotope-map/sweden-map-area-geometry"
import type { Biotope } from "@/app/tempus/ui/biotope-map/types"

const MONTHS = ["januari", "februari", "mars", "april", "maj", "juni", "juli", "augusti", "september", "oktober", "november", "december"]
const RED_LIST: Record<string, string> = {
  NT: "Nära hotad",
  VU: "Sårbar",
  EN: "Starkt hotad",
  CR: "Akut hotad",
  RE: "Nationellt utdöd",
  DD: "Kunskapsbrist",
}

// Each chapter's scroll position (0..1) is its --p, written by useScrollProgress.
// The classes below read it; --p is 1 until the script has measured, so the
// page renders finished without JavaScript.
const PROGRESS = "relative [--p:1]"
// A pinned chapter's frame fills the screen while its section scrolls past;
// on a phone it ends above the bottom menu.
const FRAME = "sticky top-0 flex h-[calc(100svh-4.5rem)] flex-col overflow-hidden sm:h-svh"
const RISE_EARLY = "opacity-[clamp(0,(var(--p)_-_0.1)*4,1)] translate-y-[calc((1_-_clamp(0,(var(--p)_-_0.1)*4,1))*2rem)]"
const RISE_LATE = "opacity-[clamp(0,(var(--p)_-_0.35)*4,1)] translate-y-[calc((1_-_clamp(0,(var(--p)_-_0.35)*4,1))*2rem)]"
const RISE_LAST = "opacity-[clamp(0,(var(--p)_-_0.6)*4,1)] translate-y-[calc((1_-_clamp(0,(var(--p)_-_0.6)*4,1))*2rem)]"
// The same steps as fades only, for text that must stay inside a drawn frame.
const FADE_LATE = "opacity-[clamp(0,(var(--p)_-_0.35)*4,1)]"
const FADE_LAST = "opacity-[clamp(0,(var(--p)_-_0.6)*4,1)]"
const HEADING = "font-display text-3xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl 2xl:text-7xl"
// A sentence under a heading, and the plain text under that.
const STATEMENT = "font-display text-xl italic sm:text-2xl lg:text-3xl 2xl:text-4xl"
const BODY = "text-base sm:text-lg lg:text-xl"
const STEP = "font-display italic text-accent no-underline hover:text-accent-hover"
// A name or link under the mouse gets a line drawn in beneath it from the left.
const UNDERLINE =
  "bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-[position:0_100%] bg-no-repeat transition-[background-size] duration-500 ease-out hover:bg-[length:100%_1px]"
// What a photo needs for the ring pointer: the word, and no system pointer.
const PHOTO_CURSOR = "[@media(pointer:fine)]:cursor-none"

// The map decorations. The atlas compass stands still and fades in as its
// chapter scrolls in.
const COMPASS_FADE = "opacity-[clamp(0,var(--p)*3,1)]"

// A faint biotope sketch in the page's ink along a chapter's right edge, drawn
// in from the right as the chapter comes up. The chapter must be `isolate`.
const SKETCH_THEME = { paper: "transparent", paperWarm: "transparent", contourMinor: "var(--text-faint)", inkSoft: "var(--text)" }
function SketchMargin({ seed, biotope }: { seed: string; biotope: Biotope }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 right-[min(0px,calc(50%_-_50vw))] -z-10 w-[70%] opacity-45 [mask-image:linear-gradient(to_left,#000_calc(var(--p)*60%),transparent_calc(var(--p)*60%_+_40%))] sm:w-[50%]"
    >
      <BiotopeMap
        seed={seed}
        biotope={biotope}
        detail={6}
        relief={6}
        waterStrength={3}
        featureAmount={3}
        compass={false}
        theme={SKETCH_THEME}
        preserveAspectRatio="xMaxYMid slice"
        className="absolute inset-0 size-full!"
      />
    </div>
  )
}

// A scale bar laid over the Sverigekarta, in the same 600 × 900 frame and
// projection as the map itself; it draws out as the map chapter scrolls in.
const MAP_PROJECTION = createProjection(600, 900, 30)
const KM_PER_DEGREE_LATITUDE = 111.2
const SCALE_KM = 200
function MapScale() {
  const [, top] = MAP_PROJECTION.toMap([16, 60])
  const [, bottom] = MAP_PROJECTION.toMap([16, 59])
  const length = ((bottom - top) / KM_PER_DEGREE_LATITUDE) * SCALE_KM
  // Out in the Baltic, south-east of Gotland, where the map is empty.
  const x = 530 - length
  const y = 860
  return (
    <svg viewBox="0 0 600 900" aria-hidden="true" className="pointer-events-none absolute inset-0 size-full">
      <g stroke="var(--text)" strokeWidth={1.2} fill="none">
        <path
          d={`M${x} ${y}H${x + length}`}
          pathLength={1}
          strokeDasharray="1 1"
          className="[stroke-dashoffset:calc(1_-_clamp(0,(var(--p)_-_0.1)*3,1))]"
        />
        {[0, 0.5, 1].map((step) => (
          <path key={step} d={`M${x + length * step} ${y - 6}V${y + 6}`} className={RISE_LATE} />
        ))}
      </g>
      <g fill="var(--text)" fontFamily="var(--font-display)" fontStyle="italic" fontSize={24} textAnchor="middle" className={RISE_LATE}>
        <text x={x} y={y + 32}>0</text>
        <text x={x + length} y={y + 32}>{SCALE_KM} km</text>
      </g>
    </svg>
  )
}

// "58°40′ N 16°18′ Ö", as on a map's margin.
function formatPosition([lon, lat]: [number, number]) {
  const part = (value: number) => {
    const degrees = Math.floor(Math.abs(value))
    const minutes = Math.round((Math.abs(value) - degrees) * 60)
    return minutes === 60 ? `${degrees + 1}°00′` : `${degrees}°${String(minutes).padStart(2, "0")}′`
  }
  return `${part(lat)} ${lat >= 0 ? "N" : "S"} ${part(lon)} ${lon >= 0 ? "Ö" : "V"}`
}

const clamp = (value: number) => Math.min(1, Math.max(0, value))
const formatCount = (value: number) => value.toLocaleString("sv-SE")
const formatDay = (value: string) =>
  new Date(value).toLocaleDateString("sv-SE", { day: "numeric", month: "long", timeZone: "Europe/Stockholm" })
const speciesName = (species: { swedish_name: string; scientific_name: string }) =>
  species.swedish_name || species.scientific_name
// The species page as the start page links it, and an observation's own page.
const speciesHref = (dyntaxaTaxonId: number) => `/taxa/oversikt/${dyntaxaTaxonId}`
const observationHref = (observationId: string) => `/observationer/${observationId}`
// A species link reached through a Tempus species id; null if the species is not in the year's list.
type SpeciesLink = (speciesId: string) => string | null
// Names and dates that lead somewhere keep their colour; the line draws in under the pointer.
const LINK = `text-current no-underline ${UNDERLINE}`

/**
 * Writes how far a chapter has scrolled (0..1) to its --p without re-rendering,
 * and passes it to `onProgress`. "pinned": through a tall section whose first
 * child sticks; "enter": from the section's top entering the screen until it
 * has risen three quarters of it. With reduced motion every chapter stays at 1.
 */
function useScrollProgress<T extends HTMLElement>(mode: "pinned" | "enter", onProgress?: (progress: number) => void) {
  const ref = useRef<T>(null)
  const callback = useRef(onProgress)
  useEffect(() => {
    callback.current = onProgress
  })

  useEffect(() => {
    const section = ref.current
    if (!section) return
    const write = (progress: number) => {
      section.style.setProperty("--p", progress.toFixed(4))
      callback.current?.(progress)
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      write(1)
      return
    }

    let frame = 0
    const measure = () => {
      frame = 0
      const rect = section.getBoundingClientRect()
      const viewport = window.innerHeight
      if (mode === "enter") {
        write(clamp((viewport - rect.top) / (viewport * 0.75)))
        return
      }
      const pinned = section.firstElementChild as HTMLElement | null
      const top = pinned ? parseFloat(getComputedStyle(pinned).top) || 0 : 0
      const travel = rect.height - (pinned?.offsetHeight ?? viewport)
      write(clamp((top - rect.top) / Math.max(1, travel)))
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
    }
  }, [mode])

  return ref
}

type OpenPhotos = (photos: string[], index: number) => void

// Over a photo, with a mouse, the pointer becomes a ring that says what a click
// does. Photos carry the word in `data-cursor` and hide the system pointer.
function PhotoCursor({ area, hidden }: { area: RefObject<HTMLElement | null>; hidden: boolean }) {
  const ring = useRef<HTMLDivElement>(null)
  const [label, setLabel] = useState<string | null>(null)

  useEffect(() => {
    const element = area.current
    const dot = ring.current
    if (!element || !dot || !window.matchMedia("(pointer: fine)").matches) return
    let frame = 0
    let x = 0
    let y = 0
    const place = () => {
      frame = 0
      dot.style.left = `${x}px`
      dot.style.top = `${y}px`
    }
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return
      x = event.clientX
      y = event.clientY
      if (!frame) frame = requestAnimationFrame(place)
      const target = (event.target as Element | null)?.closest<HTMLElement>("[data-cursor]")
      setLabel(target?.dataset.cursor ?? null)
    }
    const leave = () => setLabel(null)
    element.addEventListener("pointermove", move, { passive: true })
    element.addEventListener("pointerleave", leave)
    return () => {
      cancelAnimationFrame(frame)
      element.removeEventListener("pointermove", move)
      element.removeEventListener("pointerleave", leave)
    }
  }, [area])

  return (
    <div
      ref={ring}
      aria-hidden="true"
      className={`pointer-events-none fixed left-0 top-0 z-30 flex -translate-1/2 items-center justify-center rounded-full border border-text bg-bg font-display italic text-text transition-[width,height,opacity] duration-300 ease-out ${
        label && !hidden ? "size-20 text-sm opacity-100 lg:size-24 lg:text-base" : "size-3.5 text-[0px] opacity-0"
      }`}
    >
      {label}
    </div>
  )
}

export function YearSummary({ summary }: { summary: TempusYearSummary }) {
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null)
  const openPhotos: OpenPhotos = (photos, index) => setLightbox({ photos, index })
  const otherYears = summary.years.filter((year) => year !== summary.year)
  const photos = summary.photos ?? []
  const species = summary.species ?? []
  const area = useRef<HTMLDivElement>(null)
  const taxonById = new Map(species.map((item) => [item.id, item.dyntaxa_taxon_id]))
  const speciesLink: SpeciesLink = (speciesId) => {
    const taxonId = taxonById.get(speciesId)
    return taxonId ? speciesHref(taxonId) : null
  }

  return (
    <div className="overflow-x-clip">
      <PhotoCursor area={area} hidden={lightbox !== null} />
      <div ref={area}>
      <Opening summary={summary} />
      {summary.observation_count > 0 ? (
        <>
          {photos[0] ? (
            <LeadPhoto photo={photos[0]} speciesLink={speciesLink} onOpen={() => openPhotos(photos.map((item) => item.photo), 0)} />
          ) : null}
          {summary.points?.length ? <MapChapter summary={summary} /> : null}
          {summary.months ? <MonthsChapter summary={summary} speciesLink={speciesLink} /> : null}
          {summary.new_species_count ? <NewSpeciesChapter summary={summary} /> : null}
          {photos.length > 1 ? <PhotoStrip photos={photos} speciesLink={speciesLink} onOpen={openPhotos} /> : null}
          {summary.rarest ? (
            <RarestChapter rarest={summary.rarest} species={species} redListedCount={summary.red_listed_count ?? 0} onOpen={openPhotos} />
          ) : null}
          <Register species={species} />
        </>
      ) : null}

      {otherYears.length > 0 ? (
        <nav aria-label="Andra år" className="container mx-auto mt-16 flex flex-wrap items-baseline gap-x-5 gap-y-2 max-sm:px-4">
          <span className="font-display text-lg italic text-text-muted lg:text-xl">Andra år</span>
          {otherYears.map((year) => (
            <Link key={year} href={`/ar/${year}`} className={`${STEP} ${UNDERLINE} text-2xl tabular-nums lg:text-3xl`}>
              {year}
            </Link>
          ))}
        </nav>
      ) : null}
      </div>

      {lightbox ? (
        <Lightbox
          images={lightbox.photos}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onNavigate={(index) => setLightbox({ ...lightbox, index })}
        />
      ) : null}
    </div>
  )
}

// The opening sketch's landscapes, in the order a click steps through them.
const OPENING_BIOTOPES: Biotope[] = ["lakes", "rivers", "seashore", "marsh", "agricultural", "meadow", "mountains", "boreal"]
const BIOTOPE_LABELS: Record<Biotope, string> = {
  lakes: "sjöar",
  rivers: "rinnande vatten",
  seashore: "havsstrand",
  marsh: "våtmark",
  agricultural: "odlingslandskap",
  meadow: "ängar",
  mountains: "fjäll",
  boreal: "skog",
}
const BIOTOPE_REVEAL_MS = 1100

// The year fills the screen over a biotope sketch drawn from it; the totals
// rise in beneath it as the page starts to move. With a mouse the year leans a
// little towards the pointer, slowly, and settles back when it leaves. A click
// anywhere on it draws the next landscape in, in a circle that widens from
// where it was clicked, with a pulse of ink running out ahead of it. Clicks
// never wait for the last change to finish.
function Opening({ summary }: { summary: TempusYearSummary }) {
  const ref = useScrollProgress<HTMLElement>("pinned")
  const year = useRef<HTMLSpanElement>(null)
  const empty = summary.observation_count === 0
  const [biotope, setBiotope] = useState<Biotope>(OPENING_BIOTOPES[0])
  const [reveal, setReveal] = useState<{ biotope: Biotope; x: number; y: number; open: boolean } | null>(null)
  // Each change spins the compass rose two turns; it overshoots north a little and settles.
  const [spins, setSpins] = useState(0)
  // A click while a landscape is still opening counts from that one.
  const showing = reveal?.biotope ?? biotope
  const following = OPENING_BIOTOPES[(OPENING_BIOTOPES.indexOf(showing) + 1) % OPENING_BIOTOPES.length]

  const changeLandscape = (event: ReactMouseEvent<HTMLButtonElement>) => {
    // A click never waits: the landscape still opening is finished at once and
    // the next one opens from the new click.
    if (reveal) setBiotope(reveal.biotope)
    // Clicked before it was drawn in the background: draw it now.
    setDrawn((list) => (list.includes(following) ? list : [...list, following]))
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setBiotope(following)
      return
    }
    setSpins((count) => count + 1)
    const box = event.currentTarget.getBoundingClientRect()
    // A keyboard press has no pointer position; it opens from the middle.
    const fromPointer = event.detail > 0
    const x = fromPointer ? event.clientX - box.left : box.width / 2
    const y = fromPointer ? event.clientY - box.top : box.height / 2
    setReveal({ biotope: following, x, y, open: false })
    // Let the closed circle paint once so the opening is a transition.
    requestAnimationFrame(() => requestAnimationFrame(() => setReveal((current) => (current ? { ...current, open: true } : current))))
  }
  const settleLandscape = () => {
    if (!reveal) return
    setBiotope(reveal.biotope)
    setReveal(null)
  }
  // Generating a sketch is the slow part, so each landscape's is made once and
  // kept: the same element is handed back on every render, and React leaves it
  // alone while the needle spins or the circle opens.
  const seed = `Tempus ${summary.year}`
  const maps = useMemo(
    () =>
      Object.fromEntries(
        OPENING_BIOTOPES.map((item) => [
          item,
          <BiotopeMap
            key={item}
            seed={seed}
            biotope={item}
            detail={7}
            relief={6}
            waterStrength={4}
            featureAmount={3}
            compass={false}
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
            className="absolute inset-0 size-full!"
          />,
        ]),
      ) as Record<Biotope, ReactElement>,
    [seed],
  )
  // The landscapes drawn so far. The others are drawn one at a time while the
  // browser is idle, in the order a click reaches them, as hidden layers, so a
  // click only has to show one.
  const [drawn, setDrawn] = useState<Biotope[]>([OPENING_BIOTOPES[0]])
  useEffect(() => {
    const missing = OPENING_BIOTOPES.find((item) => !drawn.includes(item))
    if (!missing) return
    const draw = () => setDrawn((list) => (list.includes(missing) ? list : [...list, missing]))
    if ("requestIdleCallback" in window) {
      const handle = window.requestIdleCallback(draw, { timeout: 2000 })
      return () => window.cancelIdleCallback(handle)
    }
    const handle = window.setTimeout(draw, 200)
    return () => window.clearTimeout(handle)
  }, [drawn])

  const lean = (event: ReactPointerEvent<HTMLElement>) => {
    const element = year.current
    if (!element || event.pointerType !== "mouse") return
    const box = element.getBoundingClientRect()
    const x = (event.clientX - (box.left + box.width / 2)) / window.innerWidth
    const y = (event.clientY - (box.top + box.height / 2)) / window.innerHeight
    element.style.setProperty("--mx", `${(x * 40).toFixed(1)}px`)
    element.style.setProperty("--my", `${(y * 28).toFixed(1)}px`)
  }
  const settle = () => {
    year.current?.style.setProperty("--mx", "0px")
    year.current?.style.setProperty("--my", "0px")
  }

  return (
    <section ref={ref} className={`${PROGRESS} ${empty ? "" : "h-[200vh]"}`}>
      <div className={FRAME} onPointerMove={lean} onPointerLeave={settle}>
        <div className="pointer-events-none absolute inset-0 opacity-[calc(0.35_+_var(--p)*0.3)] scale-[calc(1.12_-_var(--p)*0.12)]">
          {drawn.map((item) => {
            const revealing = reveal?.biotope === item
            return (
              <div
                key={item}
                className={`absolute inset-0 ${revealing ? "z-10 transition-[clip-path] ease-[cubic-bezier(.2,.7,.2,1)]" : ""} ${
                  item === biotope || revealing ? "" : "invisible"
                }`}
                style={
                  revealing && reveal
                    ? {
                        clipPath: `circle(${reveal.open ? "150%" : "0px"} at ${reveal.x}px ${reveal.y}px)`,
                        transitionDuration: `${BIOTOPE_REVEAL_MS}ms`,
                      }
                    : undefined
                }
                onTransitionEnd={revealing ? settleLandscape : undefined}
              >
                {maps[item]}
              </div>
            )
          })}
        </div>
        {reveal ? (
          <>
            {/* The pulse: a faint ink wave from the click, and two rings, the second a beat behind.
                Keyed by the click, so a new click starts a new pulse instead of shrinking the last. */}
            <span
              key={`wave-${spins}`}
              aria-hidden="true"
              className="pointer-events-none absolute size-[60vmax] -translate-1/2 rounded-full bg-[radial-gradient(circle,var(--text)_0%,transparent_70%)] transition-[scale,opacity] ease-out"
              style={{
                left: reveal.x,
                top: reveal.y,
                scale: reveal.open ? "1" : "0",
                opacity: reveal.open ? 0 : 0.22,
                transitionDuration: `${BIOTOPE_REVEAL_MS * 0.7}ms`,
              }}
            />
            {[0, 160].map((delay) => (
              <span
                key={`ring-${spins}-${delay}`}
                aria-hidden="true"
                className="pointer-events-none absolute size-[300vmax] -translate-1/2 rounded-full border-2 border-text transition-[scale,opacity] ease-[cubic-bezier(.2,.7,.2,1)]"
                style={{
                  left: reveal.x,
                  top: reveal.y,
                  scale: reveal.open ? "1" : "0",
                  opacity: reveal.open ? 0 : 1,
                  transitionDuration: `${BIOTOPE_REVEAL_MS}ms`,
                  transitionDelay: `${delay}ms`,
                }}
              />
            ))}
          </>
        ) : null}
        <button
          type="button"
          onClick={changeLandscape}
          aria-label={`Byt kartmotiv till ${BIOTOPE_LABELS[following]}`}
          className="absolute inset-0 cursor-pointer"
        />
        <Compass
          size={112}
          className="pointer-events-none absolute bottom-6 right-4 z-10 sm:bottom-10 sm:right-10 lg:bottom-14 lg:right-16"
          needleStyle={{
            rotate: `${spins * 720}deg`,
            transition: `rotate 1600ms cubic-bezier(.25,1.3,.45,1)`,
          }}
        />
        <div className="pointer-events-none container relative mx-auto flex flex-1 flex-col justify-center max-sm:px-4">
          <h1 className="font-display text-[clamp(7rem,28vw,26rem)] font-semibold leading-[0.8] tracking-tight tabular-nums translate-y-[calc(var(--p)*-6svh)]">
            <span
              ref={year}
              className="inline-block translate-x-[var(--mx,0px)] translate-y-[var(--my,0px)] transition-[translate] duration-[900ms] ease-out motion-reduce:transition-none"
            >
              {summary.year}
            </span>
          </h1>
          {empty ? (
            <p className="mt-8 font-display text-2xl italic sm:text-3xl lg:text-4xl">Inga observationer {summary.year}.</p>
          ) : (
            <div className="relative isolate mt-8 flex w-fit flex-col gap-2 font-display text-2xl italic sm:text-4xl lg:text-5xl 2xl:text-6xl">
              {/* The map fades out behind the lines so they read clearly, with no edge. */}
              <span
                aria-hidden="true"
                className="absolute -inset-x-16 -inset-y-10 -z-10 bg-[radial-gradient(ellipse_at_center,var(--bg)_45%,transparent_72%)] opacity-[clamp(0,(var(--p)_-_0.1)*4,1)]"
              />
              <p className={RISE_EARLY}>{formatCount(summary.observation_count)} observationer.</p>
              <p className={`text-accent ${RISE_LATE}`}>{formatCount(summary.species_count)} arter.</p>
              <p className={`text-base not-italic text-text-muted sm:text-lg lg:text-xl ${RISE_LAST}`}>
                Ditt år med Tempus
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// The year's leading photo opens out from a print in the middle of the page to
// the whole screen; its caption follows once it is full.
function LeadPhoto({ photo, speciesLink, onOpen }: { photo: TempusYearPhoto; speciesLink: SpeciesLink; onOpen: () => void }) {
  const ref = useScrollProgress<HTMLElement>("pinned")
  const name = speciesName(photo)
  const species = speciesLink(photo.species_id)
  return (
    <section ref={ref} className={`${PROGRESS} h-[240vh]`}>
      <div className={FRAME}>
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Visa bilden på ${name}`}
          data-cursor="Visa"
          className={`absolute inset-0 overflow-hidden ${PHOTO_CURSOR} [clip-path:inset(calc((1_-_min(1,var(--p)*1.7))*14%)_calc((1_-_min(1,var(--p)*1.7))*24%))]`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fileProxyUrl(photo.photo)}
            alt={name}
            decoding="async"
            className="size-full object-cover scale-[calc(1.14_-_min(1,var(--p)*1.7)*0.14)]"
          />
        </button>
        <div className={`absolute bottom-6 left-0 bg-bg px-5 py-4 sm:bottom-10 lg:px-8 lg:py-6 ${RISE_LAST}`}>
          <p className="font-display text-3xl font-semibold sm:text-5xl lg:text-6xl">
            {species ? <Link href={species} className={LINK}>{name}</Link> : name}
          </p>
          <p className="mt-1 text-sm text-text-muted sm:text-base lg:text-lg">
            <Link href={observationHref(photo.observation_id)} className={LINK}>
              {formatDay(photo.observed_at)}
              {photo.locale_name ? ` · ${photo.locale_name}` : ""}
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}

// The map's title, distance and coordinates in an old map's cartouche, drawn in
// the page's ink: a field with hollowed corners and a double outline, rolled
// scrolls out to either side, an arch with a leaf above and a pendant below.
// The ornament draws itself in as the chapter scrolls; the text sits in the
// field (70–430 × 50–250 of the 500 × 300 drawing).
const CARTOUCHE_FIELD = "M88 50H412A18 18 0 0 0 430 68V232A18 18 0 0 0 412 250H88A18 18 0 0 0 70 232V68A18 18 0 0 0 88 50Z"
const CARTOUCHE_SCROLL =
  "M70 92C40 92 20 112 20 136C20 156 36 166 50 160C61 155 60 140 50 139C42 138 39 148 46 151" +
  "M70 208C40 208 20 188 20 164C20 144 36 134 50 140" +
  "M70 120C56 122 48 130 50 139M70 180C56 178 48 170 50 161"
const CARTOUCHE_CREST =
  "M196 50C206 30 228 20 250 20C272 20 294 30 304 50" +
  "M196 50C186 44 186 32 196 30C204 29 206 38 200 40" +
  "M304 50C314 44 314 32 304 30C296 29 294 38 300 40" +
  "M250 20C243 12 244 4 250 0C256 4 257 12 250 20" +
  "M214 250C224 268 238 274 250 274C262 274 276 268 286 250" +
  "M250 274C245 282 246 290 250 296C254 290 255 282 250 274"
const DRAW_IN = "[stroke-dashoffset:calc(1_-_clamp(0,(var(--p)_-_0.05)*2.5,1))]"

function Cartouche({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`@container relative aspect-[5/3] ${className}`}>
      <svg viewBox="0 0 500 300" aria-hidden="true" className="absolute inset-0 size-full overflow-visible">
        <g fill="none" stroke="var(--text)" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke">
          <path d={CARTOUCHE_SCROLL} pathLength={1} strokeDasharray="1 1" className={DRAW_IN} />
          <path d={CARTOUCHE_SCROLL} transform="matrix(-1 0 0 1 500 0)" pathLength={1} strokeDasharray="1 1" className={DRAW_IN} />
          <path d={CARTOUCHE_CREST} pathLength={1} strokeDasharray="1 1" className={DRAW_IN} />
        </g>
        <path d={CARTOUCHE_FIELD} fill="var(--bg)" stroke="var(--text)" strokeWidth={1.3} vectorEffect="non-scaling-stroke" />
        <path
          d={CARTOUCHE_FIELD}
          transform="translate(250 150) scale(0.955 0.92) translate(-250 -150)"
          fill="none"
          stroke="var(--text)"
          strokeOpacity={0.5}
          strokeWidth={0.8}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="absolute inset-x-[16%] inset-y-[19%] flex flex-col items-center justify-center gap-[0.9cqw] text-center">
        {children}
      </div>
    </div>
  )
}

// The year's positions are drawn from south to north as the chapter scrolls,
// with the atlas compass fading in and the scale bar drawing out. The text is
// the map's cartouche, laid over the sea east of the coast on a wide screen and
// under the map on a narrow one. Under the mouse a position sends out a ring
// that widens and fades.
function MapChapter({ summary }: { summary: TempusYearSummary }) {
  const points = summary.points ?? []
  const [shown, setShown] = useState(points.length)
  const ordered = [...points].sort((a, b) => a[1] - b[1])
  const ref = useScrollProgress<HTMLElement>("pinned", (progress) => {
    setShown(Math.ceil(points.length * clamp(progress / 0.75)))
  })
  const { extremes, top_locale: topLocale } = summary
  const south = extremes?.south.locale_name
  const north = extremes?.north.locale_name

  return (
    <section ref={ref} className={`${PROGRESS} h-[300vh]`}>
      <div className={FRAME}>
        <div className="container mx-auto grid min-h-0 flex-1 items-center gap-6 py-6 max-lg:grid-rows-[minmax(0,1fr)_auto] max-sm:px-4 sm:gap-8 lg:flex lg:justify-center lg:gap-16 lg:py-10 2xl:gap-24">
          <div className="flex h-full min-h-0 justify-center lg:shrink-0">
            <div className="relative aspect-[2/3] h-full max-w-full [&_[data-point-id]>circle:first-child]:origin-center [&_[data-point-id]>circle:first-child]:transition-[scale,opacity] [&_[data-point-id]>circle:first-child]:duration-700 [&_[data-point-id]>circle:first-child]:ease-out [&_[data-point-id]>circle:first-child]:[transform-box:fill-box] [&_[data-point-id]:hover>circle:first-child]:scale-[2.6] [&_[data-point-id]:hover>circle:first-child]:opacity-0">
              <SwedenMap
                points={ordered.slice(0, shown).map((coordinates, index) => ({ id: index, coordinates }))}
                pointRadius={9}
                theme={{ paper: "var(--bg)" }}
                title={`Årets ${points.length} platser på Sverigekartan`}
              />
              <MapScale />
              <Compass size={80} className={`pointer-events-none absolute left-[3%] top-[3%] ${COMPASS_FADE}`} />
            </div>
          </div>
          <Cartouche className={`mx-auto w-full max-w-[26rem] lg:mx-0 lg:w-[30rem] lg:max-w-none lg:shrink-0 2xl:w-[36rem] ${RISE_EARLY}`}>
            <h2 className="font-display text-[6.2cqw] font-semibold italic leading-[1.15]">
              {south && north && south !== north ? `Från ${south} till ${north}` : "Årets platser"}
            </h2>
            <span aria-hidden="true" className="h-px w-[8cqw] bg-text" />
            {extremes && extremes.distance_km > 0 ? (
              <>
                <p className={`font-display text-[3.6cqw] italic leading-snug ${FADE_LATE}`}>
                  <span className="text-accent tabular-nums">{formatCount(extremes.distance_km)} km</span> mellan sydligaste och nordligaste fyndet
                </p>
                <p className={`font-display text-[max(10px,2.6cqw)] italic leading-snug tabular-nums text-text-muted ${FADE_LATE}`}>
                  {formatPosition(extremes.south.coordinates)}
                  <br />
                  {formatPosition(extremes.north.coordinates)}
                </p>
              </>
            ) : null}
            {summary.locale_count > 0 ? (
              <p className={`text-[max(10px,2.6cqw)] leading-snug text-text-muted ${FADE_LAST}`}>
                {formatCount(summary.locale_count)} {summary.locale_count === 1 ? "lokal" : "lokaler"}
                {topLocale ? `. Flest observationer vid ${topLocale.name}: ${formatCount(topLocale.observation_count)}.` : "."}
              </p>
            ) : null}
          </Cartouche>
        </div>
      </div>
    </section>
  )
}

// Observations per month; the bars grow together as the chapter comes up. A
// bar under the mouse fills from the bottom in the other colour.
function MonthsChapter({ summary, speciesLink }: { summary: TempusYearSummary; speciesLink: SpeciesLink }) {
  const ref = useScrollProgress<HTMLElement>("enter")
  const months = summary.months ?? []
  const most = Math.max(...months)
  const busiest = months.indexOf(most)
  const first = summary.first_observation

  return (
    <section ref={ref} className={`${PROGRESS} container isolate mx-auto flex min-h-svh flex-col justify-center py-16 max-sm:px-4`}>
      <SketchMargin seed={`Tempus ${summary.year} månader`} biotope="agricultural" />
      <h2 className={HEADING}>
        Flest observationer i {MONTHS[busiest]}: <span className="text-accent tabular-nums">{formatCount(most)}</span>.
      </h2>
      <div className="mt-10 grid h-64 grid-cols-12 items-end gap-1.5 sm:h-80 sm:gap-3 lg:mt-14 lg:h-[26rem] 2xl:h-[32rem]">
        {months.map((count, index) => (
          <div key={MONTHS[index]} className="group flex h-full flex-col justify-end gap-2">
            <div
              title={`${MONTHS[index]}: ${formatCount(count)}`}
              className={`relative origin-bottom overflow-hidden scale-y-[var(--p)] ${index === busiest ? "bg-text" : "bg-secondary"} ${count ? "" : "h-px"}`}
              style={count ? { height: `${(count / most) * 100}%` } : undefined}
            >
              <span
                aria-hidden="true"
                className={`absolute inset-0 origin-bottom scale-y-0 transition-transform duration-500 ease-out group-hover:scale-y-100 ${index === busiest ? "bg-secondary" : "bg-text"}`}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-12 gap-1.5 text-center text-xs text-text-muted sm:gap-3 sm:text-sm lg:text-base">
        {MONTHS.map((month) => (
          <span key={month}>{month.slice(0, 3)}</span>
        ))}
      </div>
      {first ? (
        <p className={`mt-10 ${STATEMENT} ${RISE_LATE}`}>
          Årets första art:{" "}
          {speciesLink(first.species_id) ? (
            <Link href={speciesLink(first.species_id) as string} className={LINK}>{speciesName(first)}</Link>
          ) : (
            speciesName(first)
          )}
          ,{" "}
          <Link href={observationHref(first.id)} className={LINK}>
            {formatDay(first.observed_at)}
            {first.locale_name ? ` vid ${first.locale_name}` : ""}
          </Link>
          .
        </p>
      ) : null}
    </section>
  )
}

// The new species' names slide past in two rows, in opposite directions; each
// leads to its species page and is underlined under the mouse.
function NewSpeciesChapter({ summary }: { summary: TempusYearSummary }) {
  const ref = useScrollProgress<HTMLElement>("pinned")
  const fresh = (summary.species ?? []).filter((item) => item.is_new)
  const count = summary.new_species_count ?? fresh.length
  const rows = [fresh.filter((_, index) => index % 2 === 0), fresh.filter((_, index) => index % 2 === 1)]

  return (
    <section ref={ref} className={`${PROGRESS} h-[240vh]`}>
      <div className={`${FRAME} isolate justify-center gap-10`}>
        <SketchMargin seed={`Tempus ${summary.year} nya arter`} biotope="marsh" />
        <div className="container mx-auto max-sm:px-4">
          <p className="font-display text-[clamp(5rem,16vw,12rem)] font-semibold leading-none text-accent tabular-nums">
            {formatCount(count)}
          </p>
          <p className={`mt-4 font-display text-2xl italic sm:text-3xl lg:text-4xl 2xl:text-5xl ${RISE_EARLY}`}>
            {count === summary.species_count
              ? `Alla årets arter observerade du för första gången.`
              : `av årets ${formatCount(summary.species_count)} arter observerade du för första gången.`}
          </p>
        </div>
        <div className="container mx-auto flex flex-col gap-3 font-display text-4xl font-medium whitespace-nowrap max-sm:px-4 sm:text-6xl lg:text-7xl 2xl:text-8xl">
          {rows.map((row, rowIndex) =>
            row.length ? (
              <p
                key={rowIndex}
                className={rowIndex === 0 ? "translate-x-[calc(var(--p)*-35%)]" : "translate-x-[calc(-35%_+_var(--p)*35%)] pl-[10vw] italic text-secondary"}
              >
                {row.map((item, index) => (
                  <span key={item.id}>
                    {index > 0 ? <span className="px-4 text-text-faint">·</span> : null}
                    <Link href={speciesHref(item.dyntaxa_taxon_id)} className={LINK}>{speciesName(item)}</Link>
                  </span>
                ))}
              </p>
            ) : null,
          )}
        </div>
      </div>
    </section>
  )
}

// The rest of the year's photos pass as a strip while the page scrolls down.
// The chapter holds the page exactly as long as the strip is wider than the
// screen, so the strip moves one pixel per pixel scrolled; a strip that fits
// stands still in the middle. Over a photo the pointer becomes the ring.
function PhotoStrip({ photos, speciesLink, onOpen }: { photos: TempusYearPhoto[]; speciesLink: SpeciesLink; onOpen: OpenPhotos }) {
  const ref = useScrollProgress<HTMLElement>("pinned")
  const track = useRef<HTMLUListElement>(null)
  const [travel, setTravel] = useState({ overflow: 0, frame: 0 })
  const paths = photos.map((photo) => photo.photo)

  useEffect(() => {
    const strip = track.current
    const frame = ref.current?.firstElementChild as HTMLElement | null
    if (!strip || !frame) return
    const measure = () =>
      setTravel({ overflow: Math.max(0, Math.ceil(strip.scrollWidth - window.innerWidth)), frame: frame.offsetHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(strip)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [ref])

  return (
    <section
      ref={ref}
      className={PROGRESS}
      style={travel.frame ? { height: travel.frame + travel.overflow, "--shift": `${travel.overflow}px` } as CSSProperties : undefined}
    >
      <div className={`${FRAME} justify-center gap-6`}>
        <h2 className={`container mx-auto max-sm:px-4 ${HEADING}`}>Årets bilder.</h2>
        <ul
          ref={track}
          className={`flex w-max gap-4 px-[max(1rem,calc((100vw_-_80rem)/2))] translate-x-[calc(var(--p)*var(--shift,0px)*-1)] sm:gap-6 ${travel.overflow ? "" : "mx-auto"}`}
        >
          {photos.slice(1).map((photo, index) => (
            <li key={photo.observation_id}>
              <figure>
                <button
                  type="button"
                  onClick={() => onOpen(paths, index + 1)}
                  aria-label={`Visa bilden på ${speciesName(photo)}`}
                  data-cursor="Visa"
                  className={`block overflow-hidden border border-border bg-surface-2 ${PHOTO_CURSOR}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fileProxyUrl(thumbnailPath(photo.photo))}
                    alt={speciesName(photo)}
                    decoding="async"
                    className="aspect-[4/3] h-[45svh] w-auto max-w-[80vw] object-cover"
                  />
                </button>
                <figcaption className="mt-2">
                  <span className="block font-display text-lg font-semibold lg:text-xl">
                    {speciesLink(photo.species_id) ? (
                      <Link href={speciesLink(photo.species_id) as string} className={LINK}>{speciesName(photo)}</Link>
                    ) : (
                      speciesName(photo)
                    )}
                  </span>
                  <span className="block text-sm text-text-muted lg:text-base">
                    <Link href={observationHref(photo.observation_id)} className={LINK}>
                      {formatDay(photo.observed_at)}
                      {photo.locale_name ? ` · ${photo.locale_name}` : ""}
                    </Link>
                  </span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

// Every species of the year with a measured rarity, as a tick on a line from
// common to rare; the rarest stands taller, in ink, with its name above. The
// ticks rise together as the chapter comes up, and each leads to its species
// page, naming it under the mouse.
function RarityScale({ species, rarest }: { species: TempusYearSpecies[]; rarest: TempusYearSpecies }) {
  const rated = species.filter((item) => item.significance !== null)
  const at = (item: TempusYearSpecies) => `${((item.significance ?? 0) * 100).toFixed(2)}%`
  // The rarest's name hangs from its tick to the left when the tick is far right.
  const nameFromRight = (rarest.significance ?? 0) > 0.6
  return (
    <figure className="sm:col-span-2">
      <div className="relative h-24 border-b border-text sm:h-28">
        {rated.map((item) =>
          item.id === rarest.id ? null : (
            <Link
              key={item.id}
              href={speciesHref(item.dyntaxa_taxon_id)}
              aria-label={speciesName(item)}
              className="group absolute bottom-0 flex h-10 w-3 -translate-x-1/2 justify-center"
              style={{ left: at(item) }}
            >
              <span className="h-full w-px origin-bottom scale-y-[var(--p)] bg-secondary transition-[width] duration-300 group-hover:w-0.5" />
              <span className="pointer-events-none absolute bottom-full mb-1 whitespace-nowrap font-display text-sm italic text-text opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                {speciesName(item)}
              </span>
            </Link>
          ),
        )}
        <Link
          href={speciesHref(rarest.dyntaxa_taxon_id)}
          aria-label={speciesName(rarest)}
          className="absolute bottom-0 flex h-full w-3 -translate-x-1/2 justify-center"
          style={{ left: at(rarest) }}
        >
          <span className="h-full w-0.5 origin-bottom scale-y-[var(--p)] bg-text" />
          <span
            className={`pointer-events-none absolute top-0 whitespace-nowrap font-display text-base italic text-text sm:text-lg ${
              nameFromRight ? "right-full mr-2" : "left-full ml-2"
            } ${RISE_LATE}`}
          >
            {speciesName(rarest)}
          </span>
        </Link>
      </div>
      <figcaption className="mt-2 flex justify-between font-display text-sm italic text-text-muted sm:text-base">
        <span>vanlig</span>
        <span>sällsynt</span>
      </figcaption>
    </figure>
  )
}

// The species reported least often in the country, beside its photo when it
// has one, which drifts against the scroll; over it the pointer becomes the
// ring that opens it. Beneath, the year's species on a scale from common to
// rare, over a faint meadow sketch at the edge.
function RarestChapter({
  rarest,
  species,
  redListedCount,
  onOpen,
}: {
  rarest: TempusYearSpecies
  species: TempusYearSpecies[]
  redListedCount: number
  onOpen: OpenPhotos
}) {
  const ref = useScrollProgress<HTMLElement>("enter")
  const name = speciesName(rarest)
  const redList = RED_LIST[rarest.red_list_category]
  return (
    <section ref={ref} className={`${PROGRESS} container isolate mx-auto grid min-h-svh content-center items-center gap-x-10 gap-y-14 py-16 max-sm:px-4 sm:grid-cols-2`}>
      <SketchMargin seed={`Tempus ${rarest.dyntaxa_taxon_id} ovanligast`} biotope="meadow" />
      {rarest.photo ? (
        <button
          type="button"
          onClick={() => onOpen([rarest.photo as string], 0)}
          aria-label={`Visa bilden på ${name}`}
          data-cursor="Visa"
          className={`aspect-[4/5] overflow-hidden border border-border bg-surface-2 ${PHOTO_CURSOR}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fileProxyUrl(rarest.photo)}
            alt={name}
            loading="lazy"
            decoding="async"
            className="size-full object-cover scale-110 translate-y-[calc((1_-_var(--p))*-4%)]"
          />
        </button>
      ) : null}
      <div className={rarest.photo ? "" : "sm:col-span-2"}>
        <p className="font-display text-xl italic text-text-muted lg:text-2xl">Det ovanligaste fyndet</p>
        <h2 className="mt-3 font-display text-5xl font-semibold leading-none tracking-tight sm:text-7xl 2xl:text-8xl">
          <Link href={speciesHref(rarest.dyntaxa_taxon_id)} className={LINK}>{name}</Link>
        </h2>
        {rarest.scientific_name !== name ? (
          <p className="mt-3 font-display text-xl italic text-text-muted lg:text-2xl">{rarest.scientific_name}</p>
        ) : null}
        <p className={`mt-8 ${BODY} ${RISE_LATE}`}>
          {redList ? `${redList} (${rarest.red_list_category}). ` : ""}
          Först sedd {formatDay(rarest.first_observed_at)},{" "}
          {rarest.observation_count === 1 ? "en observation" : `${formatCount(rarest.observation_count)} observationer`}.
        </p>
        {redListedCount > 0 ? (
          <p className={`mt-2 ${BODY} text-text-muted ${RISE_LAST}`}>
            {redListedCount === 1 ? "En av årets arter är rödlistad." : `${formatCount(redListedCount)} av årets arter är rödlistade.`}
          </p>
        ) : null}
      </div>
      <RarityScale species={species} rarest={rarest} />
    </section>
  )
}

// Every species of the year in the order it was first seen. The list rises in
// as it comes up; each name leads to its species page and is underlined under
// the mouse.
function Register({ species }: { species: TempusYearSpecies[] }) {
  const ref = useScrollProgress<HTMLElement>("enter")
  return (
    <section ref={ref} className={`${PROGRESS} container isolate mx-auto py-16 max-sm:px-4 lg:py-24`}>
      <SketchMargin seed={`Tempus ${species.length} arter`} biotope="seashore" />
      <h2 className={`${HEADING} ${RISE_EARLY}`}>Alla {formatCount(species.length)} arter, i den ordning du såg dem.</h2>
      <ol className={`mt-10 flex flex-wrap items-center gap-x-4 gap-y-3 font-display text-xl sm:gap-x-6 sm:gap-y-4 sm:text-3xl lg:mt-14 lg:gap-x-8 lg:gap-y-5 lg:text-4xl ${RISE_LATE}`}>
        {species.map((item) => (
          <li key={item.id} className="whitespace-nowrap">
            <span>
              <Link href={speciesHref(item.dyntaxa_taxon_id)} className={LINK}>{speciesName(item)}</Link>
              {item.is_new ? <span className="ml-1.5 text-sm italic text-secondary lg:text-base">ny</span> : null}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
