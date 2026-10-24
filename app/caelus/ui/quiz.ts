import { SWEDISH_NAMES } from "./sky-cultures"
import type { Constellation, Position } from "./sky/types"

// Frågorna blandar tre sätt att fråga: en stjärnbild ritas upp och man väljer namnet, ett namn
// står och man pekar ut stjärnbilden på himlen, eller ett namn står och man väljer bland tre bilder.
export type QuizMode = "draw" | "point" | "pick"

// Vilka stjärnbilder frågorna tas bland.
export type QuizSelection = "now" | "here" | "zodiac"

export const SELECTIONS: { id: QuizSelection; label: string }[] = [
	{ id: "now", label: "Synliga nu" },
	{ id: "here", label: "Syns från din plats" },
	{ id: "zodiac", label: "Djurkretsen" },
]

export const COUNTS = [6, 12, 24]
export const DEFAULT_COUNT = 12

// Djurkretsens tolv stjärnbilder.
const ZODIAC = ["Ari", "Tau", "Gem", "Cnc", "Leo", "Vir", "Lib", "Sco", "Sgr", "Cap", "Aqr", "Psc"]
// Hur många grader över horisonten en stjärnbilds mitt ska stå för att räknas som synlig: nu,
// och som högst under dygnet från platsen.
const UP_NOW = 10
const RISES = 5
// Felalternativen väljs bland så många av de närmaste stjärnbilderna, så att läget på himlen
// inte avslöjar svaret och samma alternativ inte kommer varje gång.
const NEIGHBOURS = 4

export type QuizQuestion = {
	id: string
	mode: QuizMode
	// Svarsalternativen i den ordning de visas, med det rätta bland dem. Tomt när man pekar.
	options: string[]
}

export type Quiz = {
	selection: QuizSelection
	questions: QuizQuestion[]
	// Svaren hittills, ett per besvarad fråga: stjärnbilden man valde eller pekade på.
	answers: string[]
	// Frågan som visas; lika med antalet frågor när quizet är slut.
	index: number
}

// En stjärnbild som den visas i quizet. Ormen är delad i två på himlen och har två poster i
// katalogen; här är den en.
export type QuizConstellation = {
	id: string
	name: string
	latin: string
	at: [number, number]
	lines: [number, number][][]
}

/** Katalogens stjärnbilder, en per id, med svenska namn. */
export function quizConstellations(constellations: Constellation[]): QuizConstellation[] {
	const byId = new Map<string, QuizConstellation>()
	for (const constellation of constellations) {
		const known = byId.get(constellation.id)
		if (known) {
			known.lines = [...known.lines, ...constellation.lines]
			continue
		}
		byId.set(constellation.id, {
			id: constellation.id,
			name: SWEDISH_NAMES[constellation.id] ?? constellation.name,
			latin: constellation.name,
			at: constellation.at,
			lines: constellation.lines,
		})
	}
	return [...byId.values()]
}

function shuffle<T>(items: T[]) {
	const result = [...items]
	for (let index = result.length - 1; index > 0; index--) {
		const other = Math.floor(Math.random() * (index + 1))
		;[result[index], result[other]] = [result[other], result[index]]
	}
	return result
}

// Vinkelavståndet i grader mellan två punkter på himlen, [rektascension, deklination].
function separation([ra1, dec1]: [number, number], [ra2, dec2]: [number, number]) {
	const radians = Math.PI / 180
	const cosine =
		Math.sin(dec1 * radians) * Math.sin(dec2 * radians) +
		Math.cos(dec1 * radians) * Math.cos(dec2 * radians) * Math.cos((ra1 - ra2) * radians)
	return Math.acos(Math.min(1, Math.max(-1, cosine))) / radians
}

/**
 * Stjärnbilderna i ett urval. `heights` är hur högt varje stjärnbilds mitt står just nu, i grader,
 * efter id.
 */
export function selectionPool(
	selection: QuizSelection,
	constellations: QuizConstellation[],
	position: Position,
	heights: Map<string, number>,
) {
	if (selection === "zodiac") return constellations.filter(item => ZODIAC.includes(item.id))
	if (selection === "now") return constellations.filter(item => (heights.get(item.id) ?? -90) > UP_NOW)
	// Mitten når som högst 90° − |latitud − deklination| över horisonten.
	return constellations.filter(item => 90 - Math.abs(position.latitude - item.at[1]) > RISES)
}

/**
 * Ett nytt quiz med `count` frågor, eller färre om urvalet inte räcker. Varje stjärnbild kommer
 * högst en gång. Sätten att fråga turas om i blandad ordning, så att samma sätt aldrig kommer tre
 * gånger i följd; att peka ut går bara med stjärnbilder som står uppe nu.
 */
export function createQuiz(
	selection: QuizSelection,
	count: number,
	pool: QuizConstellation[],
	heights: Map<string, number>,
): Quiz {
	const chosen = shuffle(pool).slice(0, count)
	let round: QuizMode[] = []
	const questions = chosen.map((constellation, index): QuizQuestion => {
		if (index % 3 === 0) round = shuffle<QuizMode>(["draw", "point", "pick"])
		let mode = round[index % 3]
		if (mode === "point" && (heights.get(constellation.id) ?? -90) <= UP_NOW) mode = index % 2 === 0 ? "draw" : "pick"
		if (mode === "point") return { id: constellation.id, mode, options: [] }
		const neighbours = pool
			.filter(other => other.id !== constellation.id)
			.sort((a, b) => separation(a.at, constellation.at) - separation(b.at, constellation.at))
			.slice(0, NEIGHBOURS)
		const wrong = shuffle(neighbours).slice(0, 2).map(other => other.id)
		return { id: constellation.id, mode, options: shuffle([constellation.id, ...wrong]) }
	})
	return { selection, questions, answers: [], index: 0 }
}

/** Quizet med ett svar på frågan som visas; en fråga som redan besvarats står kvar. */
export function answerQuiz(quiz: Quiz, given: string): Quiz {
	if (quiz.answers.length > quiz.index) return quiz
	return { ...quiz, answers: [...quiz.answers, given] }
}

/** Quizet vid nästa fråga, eller vid resultatet efter den sista. */
export function nextQuestion(quiz: Quiz): Quiz {
	if (quiz.answers.length <= quiz.index) return quiz
	return { ...quiz, index: quiz.index + 1 }
}
