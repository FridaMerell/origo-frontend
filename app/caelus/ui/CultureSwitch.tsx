"use client"

import { SKY_CULTURES, type SkyCulture } from "./sky-cultures"

/** Väljaren för vilken himmel kartan visar, uppe till vänster på kartan. */
export default function CultureSwitch({
	culture,
	onChange,
}: {
	culture: SkyCulture
	onChange: (culture: SkyCulture) => void
}) {
	return (
		<div
			role='group'
			aria-label='Stjärnhimmel'
			className='absolute left-0 top-0 flex gap-3 bg-bg/85 px-3 text-sm sm:gap-5 sm:px-4 sm:text-xs sm:uppercase sm:tracking-[0.16em]'>
			{SKY_CULTURES.map(item => (
				<button
					key={item.id}
					type='button'
					aria-pressed={culture === item.id}
					onClick={() => onChange(item.id)}
					className={`cursor-pointer py-2.5 underline underline-offset-8 transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring motion-reduce:transition-none ${
						culture === item.id
							? "text-text decoration-text"
							: "text-text-muted decoration-transparent hover:text-text"
					}`}>
					{item.label}
				</button>
			))}
		</div>
	)
}
