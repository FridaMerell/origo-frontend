import type { Figure, SceneStar, SkyPoint } from "../types"
import { ease } from "../view"
import { mix, type Pen } from "./pen"
import type { LabelledStar } from "./stars"

/**
 * Figurernas namn och stjärnornas namn och bokstäver. Ordningen avgör vem som får platsen när
 * två texter krockar: framlyfta figurer, sedan stjärnor, sedan övriga figurer.
 */
export function drawNames(pen: Pen, labelled: LabelledStar[]) {
	const { context, projection, ink, paper, family, onScreen, label, spacing } = pen
	const { detail, named, raised, plain, outgoing, strength, receded, quieted, letterLimit, starScale, lettered, figuresLettered } =
		pen
	if (named <= 0.01) return
	// Den framlyfta figur en stjärna ingår i, alltså en av stjärnorna figurens linjer dras mellan;
	// inte bara en som råkar ligga inom stjärnbildens gränser.
	const vertices = raised.map(figure => ({ figure, points: figure.lines.flat() }))
	const near = ([azimuth, altitude]: SkyPoint, [starAzimuth, starAltitude]: SkyPoint) => {
		const across = ((((azimuth - starAzimuth + 540) % 360) - 180) * Math.cos((altitude * Math.PI) / 180))
		return Math.hypot(across, altitude - starAltitude) < 0.1
	}
	const figureOf = (star: SceneStar) =>
		vertices.find(({ points }) => points.some(point => near(point, star.at)))?.figure ?? null

	// De största stjärnbilderna får namn först; de mellanstora och de små tonar in i tur och
	// ordning när man zoomar in, så att kartan aldrig gror igen av text. Utzoomad, där namnen inte
	// får plats, står inga namn alls (se `named`).
	const rankAlpha = (rank: number) =>
		rank <= 1
			? ease((detail - 0.28) / 0.12)
			: rank === 2
				? ease((detail - 0.7) / 0.25)
				: ease((detail - 1.2) / 0.4)
	const figureName = (figure: Figure, alpha: number, size: number) => {
		// En figur vars mitt har gått ner har sitt namn under marken.
		if (alpha <= 0.01 || figure.at[1] < 0) return
		const point = projection(figure.at)
		if (!onScreen(point)) return
		context.globalAlpha = alpha * named
		context.font = `500 ${size}px ${family}`
		// Grekiska versaler skrivs utan accenter; för övriga alfabet gör regeln ingen skillnad.
		label(figure.name.toLocaleUpperCase("el"), point[0], point[1])
	}

	context.fillStyle = ink
	context.strokeStyle = paper
	context.lineWidth = 3.5
	context.textBaseline = "alphabetic"
	context.textAlign = "center"
	spacing("0.3em")
	// Visas stjärnbildens teckning tonas texten ovanpå den bort, så att bilden står i fokus;
	// namnet står då i raden under kartan.
	for (const figure of raised) {
		figureName(
			figure,
			mix(0.8 * receded * rankAlpha(figure.rank), 1, strength(figure)) * figuresLettered * (1 - pen.drawnFor(figure.id)),
			15 + 1.5 * strength(figure),
		)
	}

	context.font = `italic 17px ${family}`
	context.textAlign = "left"
	spacing("0px")
	for (const { star, point } of labelled) {
		const offset = (star.name ? 9 : 6) * starScale
		// Figurens egna stjärnor behåller sin text när övrig text tonas ner, men den tonas bort
		// när figurens teckning syns, så att bilden står i fokus.
		const figure = figureOf(star)
		const alpha =
			named *
			(figure ? mix(quieted, 1, strength(figure)) * (1 - pen.drawnFor(figure.id)) : quieted) *
			lettered *
			(star.fresh ? figuresLettered : 1) *
			(star.name ? 1 : Math.min(1, (letterLimit - star.magnitude) / 0.4))
		// Text som tonats bort tar ingen plats från annan text.
		if (alpha <= 0.01) continue
		context.globalAlpha = alpha
		label(star.name || star.letter, point[0] + offset, point[1] - offset * 0.6)
	}

	context.textAlign = "center"
	spacing("0.3em")
	for (const figure of plain) {
		figureName(figure, 0.8 * receded * quieted * rankAlpha(figure.rank) * figuresLettered, 15)
	}
	for (const figure of outgoing?.figures ?? []) {
		figureName(figure, 0.8 * rankAlpha(figure.rank) * outgoing!.alpha, 15)
	}
	spacing("0px")
}
