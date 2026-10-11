"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import Image, { type StaticImageData } from "next/image"
import { appHref, type AppLinkId } from "@/app/lib/tenant-links"
import apsisIcon from "../apsis/icon.png"
import fluxIcon from "../flux/icon.png"
import opusIcon from "../opus/icon.png"
import tempusIcon from "../tempus/icon.png"
import versoIcon from "../verso/icon.png"
import origoIcon from "../icon.png"
import {
	ApsisDrawing,
	FluxDrawing,
	OpusDrawing,
	TempusDrawing,
	VersoDrawing,
} from "./drawings"

type Section = {
	name: string
	icon: StaticImageData
	kind: string
	paragraphs: string[]
	drawing: ReactNode
}

const SECTIONS: Section[] = [
	{
		name: "Verso",
		icon: versoIcon,
		kind: "Hus och sommarstugor",
		paragraphs: [
			"Verso samlar det som hör till ett hus eller en sommarstuga. Du väljer en fastighet och landar på en översikt med väder, nästa vistelse, senaste uppdateringar och senaste utgifter.",
			"Under Planera ligger projekten, sorterade efter prioritet. Varje projekt har en budget, en summa av vad som gått åt och uppgifter med status, och uppgifterna kan få egna uppdateringar. Utgifter registreras med datum och belopp och kopplas till ett projekt. Besök bokas i en månadskalender där varje vistelse syns som ett band.",
			"Ritningar görs i en egen editor med linjer, polygoner, rektanglar, ellipser, mått, text och noteringar, och ytor räknas ut. De går att skriva ut. Bilder läggs i album och taggar och kan markeras som före, under eller efter. Historia har en tidslinje med händelser, foton och dokument, en personlista med släktträd och en ruta som visar vad som hänt på dagens datum.",
		],
		drawing: <VersoDrawing />,
	},
	{
		name: "Flux",
		icon: fluxIcon,
		kind: "Projekt och teknisk specifikation",
		paragraphs: [
			"Flux är projekthantering. Ett projekt har uppgifter, milstolpar och dokument. Backloggen visar det som är oplanerat eller försenat, sorterat efter prioritet, och tidslinjen lägger uppgifterna från alla projekt i samma vy.",
			"Under Modell beskrivs ett projekt tekniskt: entiteter med fält och relationer, API:ets resurser, operationer och svarstyper, skärmar, roller och providers, externa integrationer, samt vilken stack och vilka seeds leveransen bygger på.",
			"En kodgenerator läser entiteterna och API-operationerna och genererar kod för den valda stacken. Projektets visuella identitet läggs in separat och används som designtokens. Projektet antar tailwind och typescript+nextjs för web och bygger väldigt bestämt enligt hur jag själv gillar att ha min kod.",
		],
		drawing: <FluxDrawing />,
	},
	{
		name: "Tempus",
		icon: tempusIcon,
		kind: "Arter och observationer",
		paragraphs: [
			"Tempus startsida är en säsongsöversikt för ett område eller hela Sverige: aktuell vecka, vilka arters säsongsfönster som är öppna och ett register över arter månad för månad. Inloggad ser du också platser nära dig, nästa planerade rutt och de senaste observationerna.",
			"Observationer registreras en eller flera i taget. Checklistor för områden, inventeringar och utflykter skapas för hand eller importeras från CSV. Platser läggs ut på karta. Rutter planeras som en körsträcka med stopp och en sökkorridor, och stoppen rankas efter artdata.",
			"Under Utforska anger du en biotop eller miljö och får förslag på vad du kan titta efter där. Arterna går att bläddra i per taxon.",
      "BirdNet-integrationen kopplar mot ett annat projekt med en raspberry Pi som utrustas med mikrofon och spelar in fågelsång, och rapporterar löpande vad den tycker sig höra. Projektet använder BirdNets python-bibliotek fungerar skapligt, trots underdimensionerad hårdvara."
		],
		drawing: <TempusDrawing />,
	},
	{
		name: "Opus",
		icon: opusIcon,
		kind: "Böcker och ordlistor",
		paragraphs: [
			"I Opus är en bok ett verk med en eller flera utgåvor. Varje utgåva laddas upp som en fil (TXT, Markdown, HTML, PDF, EPUB eller DOCX, högst 10 MB), delas upp i meningar eller rader beroende på om det är prosa eller vers, och visas bredvid de andra utgåvorna, rad för rad.",
			"När utgåvornas kapitelindelning inte stämmer överens kan kapitel synkas för hand. Bokmärken och anteckningar sparas per verk, och anteckningarna kan innehålla hänvisningar och definitioner. Opus sparar var du slutade i varje bok, och verk kan ordnas på hyllor.",
			"Ord du definierar samlas i ordlistor, egna eller offentliga. Glosförhör kan köras på en ordlista eller på alla ord i ett språk, med ordet eller betydelsen som fråga, och förhöret pekar ut vad som behöver övas mer.",
		],
		drawing: <OpusDrawing />,
	},
	{
		name: "Apsis",
		icon: apsisIcon,
		kind: "Absider i kyrkor",
		paragraphs: [
			"Apsis utgår egentligen bara från att \"absid\" är ett väldigt bra ord. Därför kände vi att det behövdes en sida för att hylla absider.",
			"Sidan innehåller verkligen mest bilder på kyrkor och text om absider. Numera även med en koppling till svenska kyrkans API så man kan läsa lite om själva kyrkan om man vill. Vi planerar kartlägga så många absider vi bara kan.",
			"Du kan slumpa fram en kyrka ur samlingen och, inloggad, ladda upp egna foton med eller utan absid. Man kan också ladda upp absidlösa kyrkor, men de blir naturligtvis skammade.",
		],
		drawing: <ApsisDrawing />,
	},
]

const MONO_LABEL =
	"font-mono text-[11px] uppercase tracking-[0.18em] text-[#58636A]"

// One frame for every logo on the page, Origo's and the apps'. Each icon is a
// finished rounded tile with its own background, so it fills the frame.
const FRAME =
	"relative shrink-0 overflow-hidden rounded-[18%] border border-[#1B252B]/25"

// The reading line: the axis is filled down to this fraction of the viewport
// height, and a point lights up once it has passed it.
const READ_LINE = 0.6
// A section's text appears a little before its point is reached (same scale).
const REVEAL_LINE = 0.85

type Progress = { reached: boolean[]; shown: boolean[] }

const empty = (): Progress => ({
	reached: SECTIONS.map(() => false),
	shown: SECTIONS.map(() => false),
})

const sameFlags = (a: boolean[], b: boolean[]) =>
	a.length === b.length && a.every((value, i) => value === b[i])

export default function OmView() {
	const wrapperRef = useRef<HTMLDivElement>(null)
	const fillRef = useRef<HTMLSpanElement>(null)
	const headRef = useRef<HTMLSpanElement>(null)
	const [ready, setReady] = useState(false)
	const [progress, setProgress] = useState<Progress>(empty)
	const [menuOpen, setMenuOpen] = useState(false)
	// Links into the apps swap the sub-domain on the current host, so they can
	// only be built in the browser.
	const [hrefs, setHrefs] = useState<Record<string, string>>({})
	useEffect(() => {
		setHrefs(
			Object.fromEntries(
				SECTIONS.map(section => {
					const id = section.name.toLowerCase() as AppLinkId
					return [id, appHref(id)]
				}),
			),
		)
	}, [])

	// The menu is mounted a moment before it is shown, and kept mounted while
	// it animates out, so both directions can transition.
	const [menuMounted, setMenuMounted] = useState(false)
	const [menuShown, setMenuShown] = useState(false)
	const current = progress.reached.lastIndexOf(true)

	useEffect(() => {
		if (!menuOpen) return
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setMenuOpen(false)
		}
		window.addEventListener("keydown", onKeyDown)
		return () => window.removeEventListener("keydown", onKeyDown)
	}, [menuOpen])

	useEffect(() => {
		if (menuOpen) {
			setMenuMounted(true)
			let inner = 0
			const outer = window.requestAnimationFrame(() => {
				inner = window.requestAnimationFrame(() => setMenuShown(true))
			})
			return () => {
				window.cancelAnimationFrame(outer)
				window.cancelAnimationFrame(inner)
			}
		}
		setMenuShown(false)
		const timer = window.setTimeout(() => setMenuMounted(false), 380)
		return () => window.clearTimeout(timer)
	}, [menuOpen])

	const reduceMotion = () =>
		typeof window !== "undefined" &&
		window.matchMedia("(prefers-reduced-motion: reduce)").matches

	// Each row of the menu rises and fades in a little after the one above it.
	const sheetItem = (index: number) => ({
		className:
			"transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none " +
			(menuShown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"),
		style: {
			transitionDelay:
				menuShown && !reduceMotion() ? `${160 + index * 55}ms` : "0ms",
		},
	})

	const goTo = (id: string) => {
		const behavior: ScrollBehavior = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches
			? "auto"
			: "smooth"
		if (id === "top") window.scrollTo({ top: 0, behavior })
		else
			document.getElementById(id)?.scrollIntoView({ behavior, block: "start" })
		setMenuOpen(false)
	}

	useEffect(() => {
		const wrapper = wrapperRef.current
		const fill = fillRef.current
		const head = headRef.current
		if (!wrapper || !fill || !head) return

		const paint = (position: number) => {
			const height = wrapper.offsetHeight || 1
			fill.style.transform = `scaleY(${position / height})`
			head.style.transform = `translateY(${position}px)`
		}

		const measure = () => {
			const readMark = window.innerHeight * READ_LINE
			const box = wrapper.getBoundingClientRect()
			paint(Math.max(0, Math.min(box.height, readMark - box.top)))

			const dots = Array.from(
				wrapper.querySelectorAll<HTMLElement>("[data-dot]"),
			)
			const sections = Array.from(
				wrapper.querySelectorAll<HTMLElement>("[data-row]"),
			)
			const reached = dots.map(
				dot => dot.getBoundingClientRect().top < readMark,
			)
			const shown = sections.map(
				row =>
					row.getBoundingClientRect().top < window.innerHeight * REVEAL_LINE,
			)
			setProgress(previous =>
				sameFlags(previous.reached, reached) && sameFlags(previous.shown, shown)
					? previous
					: { reached, shown },
			)
		}

		let pending = 0
		const onScroll = () => {
			if (!pending)
				pending = window.requestAnimationFrame(() => {
					pending = 0
					measure()
				})
		}

		measure()
		setReady(true)

		window.addEventListener("scroll", onScroll, { passive: true })
		window.addEventListener("resize", onScroll)
		return () => {
			window.removeEventListener("scroll", onScroll)
			window.removeEventListener("resize", onScroll)
			if (pending) window.cancelAnimationFrame(pending)
		}
	}, [])

	return (
		<main className='min-h-screen overflow-x-clip bg-[#E7E5DE] py-6 text-[#1B252B] sm:py-10'>
			<div className='container mx-auto'>
				<header className='flex flex-wrap items-center justify-between gap-3'>
					<span className='font-mono text-[11px] font-medium uppercase tracking-[0.18em]'>
						ORIGO / OM
					</span>
					<a
						href='/'
						className='font-mono text-[11px] uppercase tracking-[0.12em] underline underline-offset-4'>
						Till startsidan
					</a>
				</header>

				<div ref={wrapperRef} className='relative mt-10'>
					{/* The axis: a hairline for the whole page, ruler ticks beside it, a
              fill that follows the reader and a marker at the fill's end. */}
					<span
						aria-hidden
						className='absolute bottom-0 left-5 top-0 w-px bg-[#1B252B]/20 md:left-1/2'
					/>
					<span
						aria-hidden
						className='absolute bottom-0 left-[15px] top-0 w-[10px] md:left-[calc(50%-5px)]'
						style={{
							background:
								"repeating-linear-gradient(to bottom, rgba(27,37,43,0.3) 0, rgba(27,37,43,0.3) 1px, transparent 1px, transparent 24px)",
						}}
					/>
					<span
						ref={fillRef}
						aria-hidden
						className='absolute bottom-0 left-5 top-0 w-px origin-top bg-[#1B252B] will-change-transform md:left-1/2'
						style={{ transform: "scaleY(0)" }}
					/>
					<span
						ref={headRef}
						aria-hidden
						className='absolute left-5 top-0 z-20 -ml-[5px] -mt-[5px] size-[11px] rounded-full bg-[#1B252B] shadow-[0_0_0_5px_rgba(27,37,43,0.12)] will-change-transform md:left-1/2'
						style={{ transform: "translateY(0)" }}
					/>
					<button
						type='button'
						aria-label='Öppna navigering'
						aria-expanded={menuOpen}
						onClick={() => setMenuOpen(true)}
						className='absolute inset-y-0 left-0 z-30 w-10 md:hidden'
					/>

					<section className='flex flex-col md:flex-row'>
						<div className='py-10 pl-14 md:w-1/2 md:py-[72px] md:pl-0 md:pr-24'>
							<span className={MONO_LABEL}>Om</span>
							<div className='mt-4 flex items-center gap-4 md:gap-6'>
								<span className={FRAME + " size-16 md:size-28"}>
									<Image
										src={origoIcon}
										alt=''
										width={112}
										height={112}
										className='size-full object-cover'
									/>
								</span>
								<h1 className='text-6xl font-medium leading-none tracking-[-0.04em] md:text-[clamp(72px,9vw,136px)]'>
									Origo
								</h1>
							</div>
						</div>
						<div className='flex flex-col justify-end gap-4 pb-12 pl-14 md:w-1/2 md:py-[72px] md:pl-24'>
							<p className='text-xl leading-relaxed md:text-[22px]'>
								Origo är en samling appar som delar inloggning och användare.
								Apparna har olika uppgifter och byggs separat, av en person, i
								den takt tiden räcker till.
							</p>
							<p className='text-[17px] leading-[1.65] text-[#3A464D]'>
								Bakom ligger ett Django-API och en frontend i Next.js. Det mesta
								kräver inlogg. Har du fått en inbjudan går du med via länken du
								fick.
							</p>
							<p className='text-[17px] leading-[1.65] text-[#3A464D]'>
                Inlogget kan användas för att utfärda en personlig access token för egen integration av systemen, men den dokumentationen är säkerligen inte helt aktuell.
              </p>
							<p className='text-[17px] leading-[1.65] text-[#3A464D]'>
								Fåvitsko betyder dåraktig eller oförståndigt. Eftersom projektet
								är till största del ett dumt hobbyprojekt för inbördes beundran
								passar det utmärkt som namn. Men eftersom jag är jobbig på det
								viset får apparna namn på latin, bara för kontrastens skull.
							</p>
						</div>
					</section>

					<div className='relative h-0'>
						<span
							aria-hidden
							className='absolute -top-7 left-5 z-10 -ml-7 flex size-14 items-center justify-center rounded-full border border-[#1B252B] bg-[#E7E5DE] font-mono text-[11px] md:left-1/2'>
							0,0
						</span>
					</div>

					{SECTIONS.map((section, index) => {
						const flipped = index % 2 === 1
						const reached = progress.reached[index]
						// Before the script has run everything is visible, so the page
						// reads fine without it.
						const hidden = ready && !progress.shown[index]
						const reveal =
							"transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none " +
							(hidden ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100")
						return (
							<section
								key={section.name}
								id={section.name.toLowerCase()}
								data-row
								className='relative flex scroll-mt-4 flex-col border-t border-[#1B252B]/35 md:flex-row'>
								<span
									data-dot
									aria-hidden
									className={
										"absolute left-5 top-[52px] z-10 -ml-[8px] size-4 rounded-full border border-[#1B252B] transition-[background-color,box-shadow] duration-500 motion-reduce:transition-none md:left-1/2 md:top-[76px] " +
										(reached
											? "bg-[#1B252B] shadow-[0_0_0_6px_rgba(27,37,43,0.12)]"
											: "bg-[#E7E5DE] shadow-[0_0_0_0_rgba(27,37,43,0)]")
									}
								/>
								<span
									aria-hidden
									className={
										"absolute left-[28px] top-[59px] h-px w-[20px] bg-[#1B252B] transition-transform duration-500 ease-out motion-reduce:transition-none md:top-[83px] md:w-12 " +
										(flipped
											? "origin-left md:left-[calc(50%+8px)] "
											: "origin-right md:left-[calc(50%-56px)] ") +
										(reached ? "scale-x-100" : "scale-x-0")
									}
								/>
								<span
									aria-hidden
									className={
										"absolute top-[74px] hidden font-mono text-[10px] tracking-[0.14em] text-[#58636A] transition-opacity duration-500 motion-reduce:transition-none md:block " +
										(flipped
											? "md:right-[calc(50%+24px)] "
											: "md:left-[calc(50%+24px)] ") +
										(reached ? "opacity-100" : "opacity-0")
									}>
									{String(index + 1).padStart(2, "0")}
								</span>

								<div
									className={
										"flex flex-col gap-4 pb-10 pl-14 pt-12 md:w-1/2 md:pb-20 md:pt-[72px] " +
										(flipped ? "md:order-2 md:pl-24 " : "md:pl-0 md:pr-24 ") +
										reveal
									}>
									<span className={MONO_LABEL}>{section.kind}</span>
									<div className='flex items-center gap-4'>
										<span className={FRAME + " size-16"}>
											<Image
												src={section.icon}
												alt=''
												width={64}
												height={64}
												className='size-full object-cover'
											/>
										</span>
										<h2 className='text-5xl font-medium leading-none tracking-[-0.03em] md:text-6xl'>
											{section.name}
										</h2>
									</div>
									{section.paragraphs.map((paragraph, i) => (
										<p
											key={paragraph}
											className={
												i === 0
													? "text-lg leading-relaxed md:text-xl"
													: "text-[17px] leading-[1.65] text-[#3A464D]"
											}>
											{paragraph}
										</p>
									))}
								</div>

								<div
									className={
										"pb-12 pl-14 md:w-1/2 md:pb-20 md:pt-[72px] " +
										(flipped ? "md:order-1 md:pl-0 md:pr-24 " : "md:pl-24 ") +
										reveal
									}
									style={{ transitionDelay: hidden ? "0ms" : "120ms" }}>
									{section.drawing}
									<a
										href={hrefs[section.name.toLowerCase()] ?? "#"}
										className='mt-4 inline-block font-mono text-[11px] uppercase tracking-[0.12em] underline underline-offset-4'>
										Öppna {section.name} &#8599;
									</a>
								</div>
							</section>
						)
					})}
				</div>

				<footer className='mt-4 border-t border-[#1B252B]/35 pl-14 pt-8 font-mono text-[10px] uppercase leading-[1.8] tracking-[0.16em] text-[#58636A] md:pl-0'>
					Byggs och underhålls sporadiskt av Frida Merell
					<br />
					Kontakt: frida.merell@gmail.com
				</footer>
			</div>

			{menuMounted && (
				<div className='fixed inset-0 z-50 md:hidden'>
					<button
						type='button'
						aria-label='Stäng navigering'
						onClick={() => setMenuOpen(false)}
						className={
							"absolute inset-0 bg-[#1B252B]/40 backdrop-blur-[2px] transition-opacity duration-300 motion-reduce:transition-none " +
							(menuShown ? "opacity-100" : "opacity-0")
						}
					/>
					<nav
						aria-label='Sidans delar'
						className={
							"absolute inset-x-0 bottom-0 border-t border-[#1B252B] bg-[#E7E5DE] transition-transform duration-[450ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none " +
							(menuShown ? "translate-y-0" : "translate-y-full")
						}>
						<div
							className={
								"flex items-center justify-between px-5 pb-1 pt-4 " +
								sheetItem(0).className
							}
							style={sheetItem(0).style}>
							<span className={MONO_LABEL}>Sidans delar</span>
							<button
								type='button'
								onClick={() => setMenuOpen(false)}
								className='font-mono text-[11px] uppercase tracking-[0.12em] underline underline-offset-4'>
								Stäng
							</button>
						</div>
						<ul>
							{[
								{
									id: "top",
									name: "Om Origo",
									note: "Överst",
									icon: origoIcon as StaticImageData | null,
								},
								...SECTIONS.map(section => ({
									id: section.name.toLowerCase(),
									name: section.name,
									note: section.kind,
									icon: section.icon as StaticImageData | null,
								})),
							].map((item, i) => {
								// Index 0 is the top of the page, 1.. are the apps.
								const active = i === current + 1
								return (
									<li
										key={item.id}
										className={
											"border-b border-[#1B252B]/20 " +
											sheetItem(i + 1).className
										}
										style={sheetItem(i + 1).style}>
										<a
											href={`#${item.id}`}
											onClick={event => {
												event.preventDefault()
												goTo(item.id)
											}}
											className='flex items-center gap-4 px-5 py-4 no-underline active:bg-[#1B252B] active:text-[#F4F2EC]'>
											{item.icon ? (
												<span
													aria-hidden
													className={
														FRAME +
														" size-10 " +
														(active
															? "border-[#1B252B] ring-1 ring-[#1B252B]"
															: "")
													}>
													<Image
														src={item.icon}
														alt=''
														width={40}
														height={40}
														className='size-full object-cover'
													/>
												</span>
											) : (
												<span
													aria-hidden
													className={
														"flex size-10 shrink-0 items-center justify-center"
													}>
													<span
														className={
															"size-3 rounded-full border border-current " +
															(active ? "bg-current" : "")
														}
													/>
												</span>
											)}
											<span className='text-xl font-medium tracking-tight'>
												{item.name}
											</span>
											<span className='ml-auto truncate font-mono text-[10px] uppercase tracking-[0.14em] opacity-60'>
												{item.note}
											</span>
										</a>
									</li>
								)
							})}
							<li
								className={sheetItem(SECTIONS.length + 2).className}
								style={sheetItem(SECTIONS.length + 2).style}>
								<a
									href='/'
									className='flex items-center gap-4 px-5 py-4 font-mono text-[11px] uppercase tracking-[0.12em] underline underline-offset-4'>
									Till startsidan
								</a>
							</li>
						</ul>
					</nav>
				</div>
			)}
		</main>
	)
}
