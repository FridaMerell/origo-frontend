"use client"

import { useLast } from "./use-last"

// Det panelen visar om det som klickats fram: en stjärna, en stjärnbild eller en himlakropp.
export type PanelInfo = {
	// Byts när panelen går från en sak till en annan, så att innehållet tonar in på nytt.
	key: string
	// Vad det är, för skärmläsare: "Vald stjärna", "Vald stjärnbild" …
	label: string
	title: string
	subtitle: string
	rows: [term: string, value: string][]
}

/**
 * Uppgifterna om det som klickats fram, nere till vänster på kartan. Panelen ligger kvar i
 * DOM:en med det senaste innehållet medan den tonar ut.
 */
export default function InfoPanel({ info, onClose }: { info: PanelInfo | null; onClose: () => void }) {
	const shown = useLast(info)

	return (
		<section
			aria-label={shown?.label ?? "Uppgifter"}
			inert={!info}
			className={`absolute bottom-0 left-0 w-full max-w-sm bg-bg/90 px-4 pb-3 pt-4 transition-[opacity,translate] duration-300 motion-reduce:transition-none sm:px-5 ${
				info ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
			}`}>
			{shown && (
				// Ny nyckel per sak: innehållet tonar in på nytt när man går från en till en annan.
				<div key={shown.key} className='transition-opacity duration-300 motion-reduce:transition-none starting:opacity-0'>
					<div className='flex items-baseline justify-between gap-4'>
						<h2 className='font-display text-xl italic text-text'>{shown.title}</h2>
						<button
							type='button'
							onClick={onClose}
							className='cursor-pointer text-sm text-text-muted underline underline-offset-4 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring'>
							Stäng
						</button>
					</div>
					{shown.subtitle && <p className='text-sm text-text-muted'>{shown.subtitle}</p>}
					<dl className='mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 text-sm'>
						{shown.rows.map(([term, value]) => (
							<div key={term} className='col-span-2 grid grid-cols-subgrid'>
								<dt className='italic text-text-muted'>{term}</dt>
								<dd className='text-text'>{value}</dd>
							</div>
						))}
					</dl>
				</div>
			)}
		</section>
	)
}
