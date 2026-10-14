import { dialGeometry, DIRECTION } from "../dial"
import { dialShownAt } from "../view"
import type { Pen } from "./pen"

const MONTHS = [
	"Januari", "Februari", "Mars", "April", "Maj", "Juni",
	"Juli", "Augusti", "September", "Oktober", "November", "December",
]

/**
 * Kalenderskivan: två ringar runt hela himlen. Den inre har årets dagar och månader, den yttre
 * dygnets timmar. En fast visare nere i söder pekar ut dagen och klockslaget; ringarna vrids
 * var för sig så att det som gäller står vid den. Ringarna syns bara när hela himlen är i bild.
 */
export function drawDial({ context, projection, scene, view, ink, family }: Pen) {
	const shown = dialShownAt(view.zoom)
	if (shown === 0) return
	const dial = dialGeometry(projection, view)
	if (!dial) return
	const { x, y, inner, band, outer, pointer } = dial
	const { hours, days, today } = scene.dial
	const middle = inner + band
	// På en liten karta ryms bara det grövsta.
	const fine = band >= 24

	const tick = (angle: number, from: number, to: number) => {
		context.moveTo(x + Math.cos(angle) * from, y + Math.sin(angle) * from)
		context.lineTo(x + Math.cos(angle) * to, y + Math.sin(angle) * to)
	}
	// Text längs ringen, tecken för tecken så att den följer bågen. På ringens nedre halva
	// vänds den, så att den aldrig står upp och ner.
	const along = (text: string, angle: number, radius: number, gap: number) => {
		const flipped = Math.sin(angle) > 0
		const letters = [...text]
		const widths = letters.map(letter => context.measureText(letter).width + gap)
		let at = -widths.reduce((sum, width) => sum + width, 0) / 2
		letters.forEach((letter, index) => {
			const offset = (at + widths[index] / 2) / radius
			at += widths[index]
			const turned = angle + (flipped ? -offset : offset)
			context.save()
			context.translate(x + Math.cos(turned) * radius, y + Math.sin(turned) * radius)
			context.rotate(turned + (flipped ? -Math.PI / 2 : Math.PI / 2))
			context.fillText(letter, 0, 0)
			context.restore()
		})
	}

	context.globalAlpha = shown
	context.strokeStyle = ink
	context.fillStyle = ink
	context.lineWidth = 1
	context.beginPath()
	for (const radius of [inner, middle, outer]) {
		context.moveTo(x + radius, y)
		context.arc(x, y, radius, 0, Math.PI * 2)
	}
	// Datumringen: ett streck tvärs över vid varje månadsskifte och korta streck var tionde dag.
	const dayAngle = (index: number) => pointer + (DIRECTION * (index - today) * Math.PI * 2) / days.length
	days.forEach(({ day }, index) => {
		const length = day === 1 ? 1 : day === 11 || day === 21 ? 0.22 : fine && day % 5 === 1 ? 0.12 : 0
		if (length > 0) tick(dayAngle(index), inner, inner + band * length)
	})
	// Timringen: ett streck per timme.
	const hourAngle = (hour: number) => pointer + (DIRECTION * (hour - hours) * Math.PI * 2) / 24
	for (let half = 0; half < 48; half++) {
		const length = half % 2 === 0 ? 0.2 : fine ? 0.1 : 0
		if (length > 0) tick(hourAngle(half / 2), middle, middle + band * length)
	}
	context.stroke()

	// Dagarna då något ovanligt händer på himlen har en prick vid datumringens ytterkant.
	context.beginPath()
	for (const index of scene.dial.events) {
		const angle = dayAngle(index)
		const radius = inner + band * 0.84
		const size = Math.max(1.2, band * 0.065)
		context.moveTo(x + Math.cos(angle) * radius + size, y + Math.sin(angle) * radius)
		context.arc(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, size, 0, Math.PI * 2)
	}
	context.fill()

	// Visaren: sitter fast i söder, på gränsen mellan ringarna, och pekar både in på dagen och ut
	// på klockslaget.
	const reach = (band * 0.16) / middle
	context.beginPath()
	for (const [turn, radius] of [[0, middle - band * 0.3], [-reach, middle], [0, middle + band * 0.3], [reach, middle]]) {
		context.lineTo(x + Math.cos(pointer + turn) * radius, y + Math.sin(pointer + turn) * radius)
	}
	context.fill()

	context.textAlign = "center"
	context.textBaseline = "middle"
	const size = Math.max(10, band * 0.52)
	context.font = `500 ${size}px ${family}`
	days.forEach(({ month, day }, index) => {
		if (day === 16) along(MONTHS[month].toUpperCase(), dayAngle(index), inner + band * 0.6, size * 0.12)
	})
	context.font = `${Math.max(10, band * 0.56)}px ${family}`
	for (let hour = 0; hour < 24; hour++) {
		along(String(hour).padStart(2, "0"), hourAngle(hour), middle + band * 0.62, 0)
	}
}
