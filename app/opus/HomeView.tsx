"use client"

import { LoginForm } from "../login/login-form"
import { useUser } from "../lib/user-context"
import Divider from "./ui/Divider"
import { useWorks } from "./_state/opus-context"
import { Work } from "../lib/dal/opus"
import opus from "./assets/opus.png"
import Image from "next/image"
import NewWorkForm from "./forms/NewWorkForm"
import { useState } from "react"
import Link from "next/link"

function SignedOut() {
	return (
		<section className='container py-12 sm:py-16'>
			<div className='grid gap-12 border-b border-border pb-12 lg:grid-cols-[1fr_.8fr] lg:gap-20 lg:pb-16'>
				<div className='order-2 lg:order-1'>
					<h1 className='font-display text-5xl font-semibold tracking-tight text-text sm:text-6xl'>
						Opus
					</h1>
					<p className='mt-5 font-display text-2xl leading-tight text-text sm:text-3xl mb-2'>
						Läs böcker och jämför utgåvor.
					</p>
					<p className={"text-muted"}>
						I Opus kan du ladda upp copyright-fira böcker i .docx, epub, .txt,
						och PDF-format. Ladda upp flera utgåvor för att följa textens
						förändringar över tid och genom olika tolkningar eller
						översättningar.
						<br />
						<br />
						Det finns också stöd för anteckningar, definitioner, och
						synkroniserad läsning på olika enheter.
					</p>
				</div>
				<div className='order-1 border-l border-primary pl-6 sm:pl-8 lg:order-2'>
					<h2 className='font-display text-2xl font-semibold text-text'>
						Logga in
					</h2>
					<p className='mt-2 text-sm leading-6 text-text-muted'>
						Använd dina Origo-uppgifter.
					</p>
					<div className='mt-6'>
						<LoginForm
							variant='tenant'
							buttonClass='border border-text !bg-transparent !text-text hover:!bg-text hover:!text-bg'
						/>
					</div>
				</div>
			</div>
		</section>
	)
}

function Book({ work }: { work: Work }) {
	console.log(work)
	return (
		<article
			className={
				"flex flex-col  p-5 border-l-12 bg-surface duration-200 border border-border border-l-primary rounded-xl hover:shadow-xl"
			}>
			<span className={"font-mono tracking-wide text-muted uppercase text-xs "}>
				{work.shelf_names.join(", ")}
			</span>
			<h2
				className={
					"font-display text-lg	 first-letter:text-3xl first-letter:text-primary "
				}>
				{work.title}
			</h2>
			<span className={"font-display italic mb-4"}>
				{work.contributors.map(c => c.author.name).join("j")}{" "}
				{work.year && " - " + work.year}
			</span>

			<div className={"text-xs text-muted flex flex-col gap-2"}>
				{work.editions.map((ed, index) => {
					return (
						<div key={index} className={"flex gap-2 items-center"}>
							<ins className={"w-10 font-mono text-text-faint items-center no-underline flex"}>
								{String(index+1).padStart(2, "0")}
								<hr className={"border-text-faint w-5 grow ml-1"} />
							</ins>
							<span className={'font-display'}>{ed.title}</span>
						</div>
					)
				})}
			</div>
			<hr className={'mt-5 mb-3 border-text-muted border-dashed'}/>
			<div>
				<Link href={'/verk/' + work.id}>
				Läs
				</Link>
			</div>
		</article>
	)
}

export default function HomeView() {
	const user = useUser()
	const { works, selectedWork } = useWorks()
	const [newFormOpen, setFormOpen] = useState<boolean>(false)
	if (!user) return <SignedOut />

	return (
		<>
			<section className={"flex justify-between gap-5"}>
				<div className={"flex flex-col max-w-100"}>
					<span className='font-mono tracking-widest uppercase text-primary'>
						Bibliotek
					</span>
					<h1 className={"font-display text-3xl font-bold"}>Bokhylla</h1>
					<p className={"text-md"}>
						Väl eller ladda upp ett verk. Varje verk kan ha egna utgåvor,
						översättningar, eller tolkningar.
					</p>
				</div>
				{selectedWork ? (
					<>
						<Image
							height='200'
							src={opus.src}
							alt='Ladda upp en bok eller börja läsa'
						/>
					</>
				) : (
					<>Börja läs</>
				)}
			</section>
			<Divider>
				<span className={"font-mono text-sm tracking-wide uppercase"}>
					{works.length > 0
						? `${works.length} böcker`
						: "Inga böcker uppladdade"}{" "}
				</span>
			</Divider>
			<section className={"grid grid-cols-2 gap-3 my-5 lg:grid-cols-4"}>
				{works.map(w => (
					<Book work={w} key={w.id} />
				))}
				<article
					onClick={() => {
						setFormOpen(true)
					}}
					className={
						"flex flex-col gap-3 items-center justify-center cursor-pointer p-2 py-10 rounded-xl border-2 border-dashed border-foreground/20 text-center text-muted-foreground"
					}>
					<span className='font-serif text-4xl text-primary/60'>+</span>
					<h2 className='font-serif text-lg'>Ladda upp en ny bok</h2>
					<span className='max-w-[26ch] text-sm'>
						Börja med en originalutgåva, lägg sedan till översättningar och
						tolkningar.
					</span>
				</article>
				<NewWorkForm open={newFormOpen} onOpenChange={setFormOpen} />
			</section>
		</>
	)
}
