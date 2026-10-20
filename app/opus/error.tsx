"use client"

import { useEffect } from "react"
import Link from "next/link"

export default function OpusError({
	error,
	retry,
}: {
	error: Error & { digest?: string }
	retry: () => void
}) {
	useEffect(() => {
		console.error(error)
	}, [error])

	return (
		<section className='flex min-h-[60vh] flex-col justify-center'>
			<span className='font-mono text-sm uppercase tracking-widest text-primary'>
				Något gick fel
			</span>
			<p
				aria-hidden
				className='mt-2 font-display text-8xl font-semibold italic leading-none tracking-tight text-text sm:text-9xl'>
				Oj.
			</p>
			<span aria-hidden className='mt-6 block h-1 w-16 bg-accent' />
			<h1 className='mt-6 font-display text-3xl font-semibold tracking-tight text-text sm:text-5xl'>
				Ett tryckfel
			</h1>
			<p className='mt-3 max-w-prose leading-relaxed text-text-muted'>
				Något gick snett när sidan skulle sättas. Du kan försöka igen, eller gå
				tillbaka till bokhyllan.
			</p>
			<div className='mt-8 flex flex-wrap items-center gap-3'>
				<button
					type='button'
					onClick={() => retry()}
					className='inline-flex items-center rounded-md border border-text bg-text px-5 py-2.5 font-medium text-bg transition-colors hover:bg-transparent hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring'>
					Försök igen
				</button>
				<Link
					href='/'
					className='inline-flex items-center rounded-md border border-text px-5 py-2.5 font-medium text-text no-underline transition-colors hover:bg-text hover:text-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring'>
					Till bokhyllan
				</Link>
			</div>
		</section>
	)
}
