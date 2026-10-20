import type { ReadingUnit } from "@/app/lib/dal/opus"

/**
 * Kapitlets namn ovanför stycket som inleder det. Kapitel utan text (platshållare för kapitel
 * som utgåvan saknar) och som står direkt före visas ovanför, dämpade.
 */
export default function ChapterHeading({ unit }: { unit: ReadingUnit }) {
	if (!unit.starts_chapter || !unit.chapter) return null
	return (
		<div className='mb-2 flex flex-col gap-1 border-b border-border pb-2'>
			{unit.empty_chapters_before?.map((label, index) => (
				<p key={index} className='font-display text-sm italic text-text-muted'>
					{label} <span className='not-italic'>— saknas i den här utgåvan</span>
				</p>
			))}
			<h3 className='font-display text-lg font-semibold leading-snug text-text first-letter:mr-0.5 first-letter:text-3xl first-letter:leading-none first-letter:text-primary'>
				{unit.chapter.label}
			</h3>
		</div>
	)
}
