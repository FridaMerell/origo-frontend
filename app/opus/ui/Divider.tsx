import { ReactNode } from "react"

export default function ({ children }: { children?: ReactNode }) {
	return (
		<div className='mt-8 flex items-center text-foreground/40'>
			<div className='h-px flex-1 bg-foreground/20' />

			{children && (
				<>
					<span className='px-3 font-serif text-lg leading-none text-primary/70'>
						❧
					</span>
					{children}
					<span className='px-3 font-serif text-lg leading-none text-primary/70 transform-[scaleX(-1)]'>
						❧
					</span>
				</>
			)}
			<div className='h-px flex-1 bg-foreground/20' />
		</div>
	)
}
