// Orion som på en atlasplåt: stjärnorna på sina verkliga platser (1° = 14 enheter, öster åt
// vänster som på himlen), storlek efter magnitud och Bayers grekiska bokstäver.
// dx/dy flyttar bokstaven där standardplatsen (snett upp till höger) krockar med en granne.
const STARS = [
	{ letter: "α", x: 80, y: 59, magnitude: 0.5, dx: -24, dy: -8 },
	{ letter: "β", x: 223, y: 278, magnitude: 0.1 },
	{ letter: "γ", x: 185, y: 74, magnitude: 1.6 },
	{ letter: "δ", x: 161, y: 167, magnitude: 2.2 },
	{ letter: "ε", x: 146.5, y: 180, magnitude: 1.7, dx: 7, dy: 13 },
	{ letter: "ζ", x: 130, y: 190, magnitude: 1.8, dx: -17, dy: 4 },
	{ letter: "η", x: 188, y: 197, magnitude: 3.4 },
	{ letter: "ι", x: 149, y: 246, magnitude: 2.8 },
	{ letter: "κ", x: 106, y: 298, magnitude: 2.1, dx: -18, dy: 4 },
	{ letter: "λ", x: 150, y: 24, magnitude: 3.4 },
]

const FIGURE = [
	"M150 24 80 59 130 190 106 298 223 278 161 167 185 74Z",
	"M130 190 146.5 180 161 167",
	"M80 59 185 74",
]

// Deklinationscirklar var femte grad.
const PARALLELS = [
	{ y: 23, label: "+10°" },
	{ y: 93, label: "+5°" },
	{ y: 163, label: "0°" },
	{ y: 233, label: "−5°" },
	{ y: 303, label: "−10°" },
]

function radius(magnitude: number) {
	return magnitude < 1 ? 5 : magnitude < 2 ? 3.6 : magnitude < 3 ? 2.6 : 1.8
}

export default function OrionChart({ className }: { className?: string }) {
	return (
		<svg
			viewBox='0 0 300 330'
			role='img'
			aria-label='Stjärnkarta över Orion'
			className={className}>
			<g stroke='currentColor' strokeWidth='0.5' opacity='0.35'>
				{PARALLELS.map(parallel => (
					<line key={parallel.y} x1='34' x2='300' y1={parallel.y} y2={parallel.y} />
				))}
			</g>
			<g fill='currentColor' opacity='0.7' fontSize='12' fontStyle='italic'>
				{PARALLELS.map(parallel => (
					<text key={parallel.y} x='0' y={parallel.y + 4}>
						{parallel.label}
					</text>
				))}
			</g>
			<g fill='none' stroke='currentColor' strokeWidth='0.75' strokeDasharray='1 3'>
				{FIGURE.map(path => (
					<path key={path} d={path} />
				))}
			</g>
			{STARS.map(star => (
				<g key={star.letter}>
					{star.magnitude < 1 && (
						<path
							d={`M${star.x - 10} ${star.y}H${star.x + 10}M${star.x} ${star.y - 10}V${star.y + 10}`}
							stroke='currentColor'
							strokeWidth='0.75'
						/>
					)}
					<circle cx={star.x} cy={star.y} r={radius(star.magnitude)} fill='currentColor' />
					<text
						x={star.x + (star.dx ?? radius(star.magnitude) + 5)}
						y={star.y + (star.dy ?? -5)}
						fill='currentColor'
						fontSize='15'
						fontStyle='italic'>
						{star.letter}
					</text>
				</g>
			))}
		</svg>
	)
}
