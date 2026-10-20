"use client"

import { useState } from "react"
import { ArrowRightIcon } from "lucide-react"
import { tokenizeWords } from "./text-offsets"

/** Delningsläget: klicka på ordet stycket ska delas efter och bekräfta. */
export default function SplitPicker({
	content,
	busy,
	onCancel,
	onConfirm,
}: {
	content: string
	busy: boolean
	onCancel: () => void
	/** Delar stycket efter teckenpositionen `at`. */
	onConfirm: (at: number) => void
}) {
	const [splitAt, setSplitAt] = useState<number | null>(null)

	return (
		<div>
			<p className='leading-relaxed'>
				{tokenizeWords(content).map((token, index) =>
					// Efter sista ordet finns ingen text kvar att dela av; det ordet är ingen delningspunkt.
					token.isWord && content.slice(token.end).trim() !== "" ? (
						<span key={index}>
							<button
								type='button'
								onClick={() => setSplitAt(token.end)}
								className={`cursor-pointer rounded px-0.5 -mx-0.5 hover:bg-primary/15 ${
									splitAt === token.end
										? "bg-primary/20 underline decoration-primary decoration-2 underline-offset-2"
										: ""
								}`}>
								{token.text}
							</button>
							{splitAt === token.end && (
								<ArrowRightIcon
									aria-hidden
									size={12}
									className='-mt-1 inline text-primary'
								/>
							)}
						</span>
					) : (
						<span key={index}>{token.text}</span>
					),
				)}
			</p>
			<p className='mt-2 text-xs text-text/80'>
				Klicka på ordet stycket ska delas efter. Pilen visar var delningen sker.
			</p>
			<div className='mt-2 flex items-center gap-3'>
				<button
					type='button'
					onClick={onCancel}
					className='font-body text-sm text-text underline underline-offset-4 hover:text-primary cursor-pointer'>
					Avbryt
				</button>
				<button
					type='button'
					disabled={busy || splitAt == null}
					onClick={() => {
						if (splitAt != null) onConfirm(splitAt)
					}}
					className='rounded-md px-3 py-1.5 font-body text-sm font-semibold bg-primary text-bg hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer'>
					{busy ? "Delar…" : "Dela här"}
				</button>
			</div>
		</div>
	)
}
