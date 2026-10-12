"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { Button } from "@/app/components/ui/Button"
import type { LexicalEntry } from "@/app/lib/dal/opus"
import { getGlossaryQuiz } from "../_actions/glossary-actions"
import { getLanguageQuiz, setQuizMark } from "../_actions/lexical-entry-actions"
import { SelectField } from "../forms/Fields/Fields"
import Divider from "../ui/Divider"
import { describeForm, languageName } from "../ordlistor/lexical-forms"

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"

/** Servern lämnar ut högst så här många ord per förhör. */
const MAX_COUNT = 200

type Direction = "word" | "meaning"

/** Var orden hämtas: dina ord på ett språk, eller en ordlista. */
export type QuizSource = { kind: "language"; language: string } | { kind: "glossary"; id: number }

/** Det som visas som fråga, och det man ska komma ihåg. */
function promptOf(entry: LexicalEntry, direction: Direction) {
	return direction === "word" ? entry.lemma : entry.translation || entry.definition
}

function modernFormOf(entry: LexicalEntry) {
	const value = entry.inflection_data?.modern_form
	return typeof value === "string" ? value : ""
}

/** Hela svaret: ordet och allt som står om det. */
function Answer({ entry, direction }: { entry: LexicalEntry; direction: Direction }) {
	const modernForm = modernFormOf(entry)
	const facts = [entry.part_of_speech, entry.gender, modernForm && `Modernt: ${modernForm}`].filter(Boolean)
	const forms = entry.forms ?? []

	return (
		<div className='flex flex-col gap-2'>
			{direction === "word" ? (
				entry.translation && <p className='font-display text-2xl font-semibold text-text'>{entry.translation}</p>
			) : (
				<p className='font-display text-2xl font-semibold text-text'>{entry.lemma}</p>
			)}
			{facts.length > 0 && <p className='text-sm text-text-muted'>{facts.join(" · ")}</p>}
			{entry.definition && (direction === "word" || entry.translation) && (
				<p className='font-display text-lg leading-relaxed text-text'>{entry.definition}</p>
			)}
			{forms.length > 0 && (
				<ul className='mt-1 flex flex-col gap-0.5 text-sm'>
					{forms.map(form => (
						<li key={form.id}>
							<span className='font-display italic text-text'>{form.form}</span>{" "}
							<span className='text-text-muted'>{describeForm(form)}</span>
							{form.source && form.unit && (
								<>
									{" · "}
									{/* Ny flik, så att förhöret inte avbryts. */}
									<Link
										href={`/verk/${form.source.work.id}?enhet=${form.unit}`}
										target='_blank'
										rel='noopener'
										title='Visa i texten (ny flik)'
										className={`rounded-sm text-text-muted underline underline-offset-4 hover:text-text ${FOCUS}`}>
										{[form.source.work.title, form.source.edition_title, form.source.chapter?.label]
											.filter(Boolean)
											.join(", ")}
									</Link>
								</>
							)}
						</li>
					))}
				</ul>
			)}
		</div>
	)
}

/** Glosförhör: ett ord i taget, man försöker minnas svaret, visar det och säger själv om man kunde det. */
export default function QuizView({
	source,
	scope,
	entryCount,
	markedCount,
	back,
}: {
	source: QuizSource
	/** Varifrån orden kommer, i löptext: "bland dina ord på latin", "ur Ordlistan". */
	scope: string
	entryCount: number
	/** Hur många av orden som är markerade för förhör. */
	markedCount: number
	back: { href: string; label: string }
}) {
	// Antalet markerade ord följer med när man markerar eller avmarkerar under förhöret.
	const [marked, setMarked] = useState(markedCount)
	// Finns det markerade ord förhörs de, så att en lång lista inte slumpar fram vad som helst.
	const [wantsMarked, setOnlyMarked] = useState(true)
	const onlyMarked = wantsMarked && marked > 0
	const available = Math.min(onlyMarked ? marked : entryCount, MAX_COUNT)
	const counts = [10, 20, 50].filter(count => count < available)
	const [wantedCount, setCount] = useState("20")
	// Antalet följer urvalet: ett val som inte längre finns blir "alla".
	const count = counts.includes(Number(wantedCount)) ? wantedCount : String(available)
	const [direction, setDirection] = useState<Direction>("word")
	// Markeringar som ändrats under förhöret; servern har redan fått dem.
	const [marks, setMarks] = useState<Record<number, boolean>>({})
	const [words, setWords] = useState<LexicalEntry[] | null>(null)
	const [index, setIndex] = useState(0)
	const [revealed, setRevealed] = useState(false)
	const [wrong, setWrong] = useState<LexicalEntry[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	function begin(list: LexicalEntry[]) {
		setWords(list)
		setIndex(0)
		setRevealed(false)
		setWrong([])
	}

	async function handleStart(event?: FormEvent<HTMLFormElement>) {
		event?.preventDefault()
		setLoading(true)
		setError(null)
		try {
			const list =
				source.kind === "language"
					? await getLanguageQuiz(source.language, Number(count), onlyMarked)
					: await getGlossaryQuiz(source.id, Number(count), onlyMarked)
			// Ett ord utan fråga i den valda riktningen går inte att förhöra.
			begin(list.filter(entry => promptOf(entry, direction)))
		} catch {
			setError("Förhöret kunde inte hämtas.")
		} finally {
			setLoading(false)
		}
	}

	/** Lägger ordet i ens förhör eller tar det ur dem, t.ex. när man märker att man kan det. */
	async function toggleMark(entry: LexicalEntry) {
		const mark = !(marks[entry.id] ?? entry.in_quiz)
		setError(null)
		try {
			await setQuizMark(entry.id, mark)
			setMarks(previous => ({ ...previous, [entry.id]: mark }))
			setMarked(previous => previous + (mark ? 1 : -1))
		} catch {
			setError("Markeringen kunde inte sparas.")
		}
	}

	function handleAnswer(knewIt: boolean) {
		if (!words) return
		if (!knewIt) setWrong(previous => [...previous, words[index]])
		setRevealed(false)
		setIndex(previous => previous + 1)
	}

	const backLink = (
		<p className='mb-4'>
			<Link
				href={back.href}
				className={`font-display italic text-text-muted underline underline-offset-4 hover:text-text ${FOCUS}`}>
				← {back.label}
			</Link>
		</p>
	)

	if (entryCount === 0) {
		return (
			<>
				{backLink}
				<p className='my-10 text-center font-display text-lg text-text-muted'>Det finns inga ord att förhöra.</p>
			</>
		)
	}

	// Inställningar innan förhöret börjar.
	if (words === null) {
		return (
			<>
				{backLink}
				<h1 className='font-display text-3xl font-bold text-text'>Glosförhör</h1>
				<p className='mt-2 text-text-muted'>
					Ett ord i taget {scope}. Försök minnas svaret, visa det och säg själv om du kunde det.
				</p>
				<Divider />
				<form onSubmit={handleStart} className={`mt-6 grid gap-4 ${marked > 0 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
					{marked > 0 && (
						<SelectField
							label='Ord'
							value={onlyMarked ? "marked" : "all"}
							onChange={event => setOnlyMarked(event.target.value === "marked")}>
							<option value='marked'>Markerade för förhör ({marked})</option>
							<option value='all'>Alla ord ({entryCount})</option>
						</SelectField>
					)}
					<SelectField label='Antal ord' value={count} onChange={event => setCount(event.target.value)}>
						{counts.map(value => (
							<option key={value} value={value}>
								{value}
							</option>
						))}
						<option value={available}>Alla ({available})</option>
					</SelectField>
					<SelectField label='Visa' value={direction} onChange={event => setDirection(event.target.value as Direction)}>
						<option value='word'>Ordet, minns betydelsen</option>
						<option value='meaning'>Betydelsen, minns ordet</option>
					</SelectField>
					{error && (
						<p role='alert' className='text-sm text-danger sm:col-span-full'>
							{error}
						</p>
					)}
					<div className='sm:col-span-full'>
						<Button type='submit' disabled={loading}>
							{loading ? "Hämtar ord…" : "Börja"}
						</Button>
					</div>
				</form>
			</>
		)
	}

	// Resultatet när alla ord är gjorda.
	if (index >= words.length) {
		const right = words.length - wrong.length
		return (
			<>
				{backLink}
				<h1 className='font-display text-3xl font-bold text-text'>
					<span className='oldstyle-nums'>
						{right} av {words.length}
					</span>{" "}
					rätt
				</h1>
				{words.length === 0 && (
					<p className='mt-2 text-text-muted'>
						Inga av orden hade något att visa åt det hållet. Lägg till översättningar eller definitioner.
					</p>
				)}
				{wrong.length > 0 && (
					<>
						<Divider>
							<span className='font-display italic'>Att öva mer på</span>
						</Divider>
						<ul className='flex flex-col'>
							{wrong.map(entry => (
								<li key={entry.id} className='flex flex-col gap-1 border-b border-border py-3 sm:flex-row sm:gap-6'>
									<span className='font-display text-xl font-semibold text-text sm:w-56 sm:shrink-0'>{entry.lemma}</span>
									<span className='font-display text-lg text-text'>{entry.translation || entry.definition}</span>
								</li>
							))}
						</ul>
					</>
				)}
				<div className='mt-6 flex flex-wrap gap-3'>
					{wrong.length > 0 && (
						<Button type='button' onClick={() => begin([...wrong].sort(() => Math.random() - 0.5))}>
							Öva på de felaktiga
						</Button>
					)}
					<Button type='button' variant='secondary' disabled={loading} onClick={() => handleStart()}>
						{loading ? "Hämtar ord…" : "Nytt förhör"}
					</Button>
					<Button type='button' variant='ghost' onClick={() => setWords(null)}>
						Ändra inställningar
					</Button>
				</div>
			</>
		)
	}

	const entry = words[index]

	return (
		<>
			{backLink}
			<Divider>
				<span className='font-display italic oldstyle-nums'>
					{index + 1} av {words.length}
				</span>
			</Divider>
			<section className='my-6 flex min-h-64 flex-col items-center justify-center gap-6 rounded-lg border border-border bg-surface p-6 text-center'>
				<p className='font-display text-4xl font-bold text-text sm:text-5xl'>{promptOf(entry, direction)}</p>
				{/* Ett förhör på ett språk har bara det språket; en ordlista kan blanda. */}
				{source.kind === "glossary" && direction === "word" && entry.language && (
					<p className='text-sm text-text-muted'>{languageName(entry.language)}</p>
				)}
				{revealed ? (
					<Answer entry={entry} direction={direction} />
				) : (
					<Button type='button' variant='secondary' onClick={() => setRevealed(true)} autoFocus>
						Visa svar
					</Button>
				)}
			</section>
			{revealed && (
				<div className='flex justify-center gap-3'>
					<Button type='button' variant='ghost' onClick={() => handleAnswer(false)}>
						Kunde inte
					</Button>
					<Button type='button' onClick={() => handleAnswer(true)} autoFocus>
						Kunde
					</Button>
				</div>
			)}
			{revealed && (
				<p className='mt-4 text-center text-sm'>
					<button
						type='button'
						aria-pressed={marks[entry.id] ?? entry.in_quiz}
						onClick={() => toggleMark(entry)}
						className={`cursor-pointer rounded-sm text-text-muted underline underline-offset-4 hover:text-text ${FOCUS}`}>
						{(marks[entry.id] ?? entry.in_quiz) ? "Ta ur förhör" : "Lägg i förhör"}
					</button>
				</p>
			)}
			{error && (
				<p role='alert' className='mt-2 text-center text-sm text-danger'>
					{error}
				</p>
			)}
		</>
	)
}
