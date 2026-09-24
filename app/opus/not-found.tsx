import Link from "next/link"

export default function OpusNotFound() {
	return (
		<section className='flex min-h-[60vh] flex-col justify-center'>
			<span className='font-mono text-sm uppercase tracking-widest text-primary'>
				Sidan saknas
			</span>
			<p
				aria-hidden
				className='mt-2 font-display text-8xl font-semibold italic leading-none tracking-tight text-text sm:text-9xl'>
				404
			</p>
			<span aria-hidden className='mt-6 block h-1 w-16 bg-accent' />
			<h1 className='mt-6 font-display text-3xl font-semibold tracking-tight text-text sm:text-5xl'>
				Sidan finns inte i den här utgåvan
			</h1>
			<p className='mt-3 max-w-prose leading-relaxed text-text-muted'>
				Länken kan vara felaktig, eller så har sidan flyttats. Gå tillbaka till
				bokhyllan och leta vidare därifrån.
			</p>
			<Link
				href='/'
				className='mt-8 inline-flex w-fit items-center rounded-md border border-text bg-text px-5 py-2.5 font-medium text-bg no-underline transition-colors hover:bg-transparent hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring'>
				Till bokhyllan
			</Link>
		</section>
	)
}
