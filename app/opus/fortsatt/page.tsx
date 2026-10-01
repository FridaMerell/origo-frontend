import { Metadata } from "next"
import Link from "next/link"
import { LinkButton } from "@/app/components/ui/Button"
import type { ReadingProgressOverview } from "@/app/lib/dal/opus"
import { readingProgressApi } from "../_actions/actions"

export const metadata: Metadata = {
	title: "Fortsätt läsa | Origo Opus",
	description: "Böckerna du läser, där du slutade",
}

/** Kortaste utdrag som får anfang: ungefär tre rader i prosabredd. */
const DROP_CAP_MIN_LENGTH = 160

/** Synlig fokusmarkering för tangentbordsnavigering, samma som Opus formulärfält. */
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"

const RELATIVE = new Intl.RelativeTimeFormat("sv-SE", { numeric: "auto" })
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
	["year", 365 * 24 * 3600],
	["month", 30 * 24 * 3600],
	["week", 7 * 24 * 3600],
	["day", 24 * 3600],
	["hour", 3600],
	["minute", 60],
]

/** "i går", "för 3 veckor sedan", "nyss". */
function lastRead(updatedAt: string) {
	const seconds = (new Date(updatedAt).getTime() - Date.now()) / 1000
	for (const [unit, size] of UNITS) {
		if (Math.abs(seconds) >= size) return RELATIVE.format(Math.round(seconds / size), unit)
	}
	return "nyss"
}

/** Positionen ligger efter utgåvans sista enhet. (Utan enhet och under 100 % saknar utgåvan text.) */
function finished(progress: ReadingProgressOverview) {
	return !progress.unit && progress.percent === 100
}

/** Hur långt man har kommit, i ord: "påbörjad", "14 %", "utläst". */
function howFar(progress: ReadingProgressOverview) {
	if (finished(progress)) return "utläst"
	return progress.percent === 0 ? "påbörjad" : `${progress.percent} %`
}

/** Den senast lästa boken: titel och texten där man slutade, med uppgifterna i marginalen. */
function Current({ progress }: { progress: ReadingProgressOverview }) {
	return (
		<article className='grid gap-y-6 border-y border-border py-10 md:grid-cols-4 md:gap-x-10'>
			<div className='flex flex-col gap-6 md:col-span-3'>
				<h2 className='font-display text-4xl leading-tight text-text sm:text-5xl'>
					<Link href={`/verk/${progress.work}`} className={`rounded-sm hover:text-primary ${FOCUS}`}>
						{progress.work_title}
					</Link>
				</h2>
				{progress.unit && (
					// Anfang: textens första bokstav i rött över flera rader, som i en handskrift. En kort
					// rad (t.ex. en rubrik) får ingen – en ensam stor bokstav bredvid en rad ser trasig ut.
					<p
						className={`max-w-prose font-display text-xl leading-relaxed text-text ${
							progress.unit.excerpt.length > DROP_CAP_MIN_LENGTH
								? "first-letter:float-left first-letter:mr-3 first-letter:font-display first-letter:text-7xl first-letter:leading-none first-letter:text-primary"
								: ""
						}`}>
						{progress.unit.excerpt}
					</p>
				)}
				<div>
					<LinkButton href={`/verk/${progress.work}`} rounded={"rounded-md"} className={`text-sm hover:bg-primary/90 ${FOCUS}`}>
						{finished(progress) ? "Öppna boken" : "Fortsätt läsa"}
					</LinkButton>
				</div>
			</div>
			<dl className='flex flex-col gap-3 font-display text-sm italic text-text-muted oldstyle-nums md:border-l md:border-border md:pl-6'>
				{progress.edition && (
					<div>
						<dt className='sr-only'>Utgåva</dt>
						<dd>{progress.edition.title}</dd>
					</div>
				)}
				{progress.unit?.chapter && (
					<div>
						<dt className='sr-only'>Kapitel</dt>
						<dd>{progress.unit.chapter.label}</dd>
					</div>
				)}
				<div>
					<dt className='sr-only'>Hur långt</dt>
					<dd>{howFar(progress)}</dd>
				</div>
				<div>
					<dt className='sr-only'>Senast läst</dt>
					<dd>läst {lastRead(progress.updated_at)}</dd>
				</div>
			</dl>
		</article>
	)
}

/** Övriga påbörjade böcker som en innehållsförteckning: titel, prickad linje, var man är. */
function Contents({ others }: { others: ReadingProgressOverview[] }) {
	return (
		<section aria-labelledby='other-books' className='grid gap-y-6 md:grid-cols-4 md:gap-x-10'>
			<h2 id='other-books' className='font-display text-2xl text-text md:col-span-4'>
				Också påbörjade
			</h2>
			<ol className='flex flex-col gap-4 md:col-span-3'>
				{others.map(progress => (
					<li key={progress.id}>
						<Link href={`/verk/${progress.work}`} className={`group flex items-baseline gap-3 rounded-sm ${FOCUS}`}>
							<span className='font-display text-xl text-text group-hover:text-primary'>{progress.work_title}</span>
							<span aria-hidden className='min-w-8 flex-1 border-b border-dotted border-text-muted' />
							<span className='shrink-0 font-display text-sm italic text-text-muted oldstyle-nums'>
								{[progress.unit?.chapter?.label, howFar(progress)].filter(Boolean).join(", ")}
							</span>
						</Link>
						<p className='mt-1 font-display text-sm italic text-text-muted'>
							{[progress.edition?.title, `läst ${lastRead(progress.updated_at)}`].filter(Boolean).join(" · ")}
						</p>
					</li>
				))}
			</ol>
		</section>
	)
}

export default async function ContinuePage() {
	const [current, ...others] = await readingProgressApi.list()

	return (
		<div className='flex flex-col gap-10'>
			<h1 className='font-display text-4xl font-bold text-text'>Fortsätt läsa</h1>
			{!current ? (
				<p className='max-w-prose font-display text-lg text-text-muted'>
					Du har inte börjat läsa något än.{" "}
					<Link href={"/"} className={`rounded-sm text-primary underline underline-offset-4 hover:text-text ${FOCUS}`}>
						Välj en bok i bokhyllan
					</Link>
					, så hamnar den här.
				</p>
			) : (
				<>
					<Current progress={current} />
					{others.length > 0 && <Contents others={others} />}
				</>
			)}
		</div>
	)
}
