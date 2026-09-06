import { Metadata } from "next"
import PageView from "./page-view"

export const metadata: Metadata = {
	title: "Utforska biotop eller miljö | Tempus",
	description:
		"Ange information om var du ska befinna dig så hämtar Tempus förslag på vad du kan titta efter",
}

export default async function Page() {
	return (
		<article className={"container py-5 sm:py-7"}>
			<header className='flex flex-wrap items-end justify-between gap-6 border-b border-border pb-4'>
				<div className='flex flex-col gap-1'>
					<div className='font-mono text-[10px] uppercase tracking-[.2em] text-accent'>
						Utforska
					</div>
					<h1 className='font-display text-3xl font-semibold tracking-tight sm:text-4xl'>
						Utforska biotop eller miljö
					</h1>
				</div>
			</header>
			<PageView />
		</article>
	)
}
