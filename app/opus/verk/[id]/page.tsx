import { Metadata } from "next"
import { readingProgressApi, workApi } from "../../_actions/actions"
import "./page.css"
import { Edition, EditionReadingStatus } from "@/app/lib/dal/opus"
import React from "react"
import Unit from "./Unit"

export async function generateMetadata({
	params,
}: {
	params: Promise<{ id: number }>
}): Promise<Metadata> {
	const { id } = await params

	const work = id ? await workApi.retrieve(id) : null

	return {
		title: `${work?.title} | Origo Opus`,
		description: work ? work.title : "Läs copyrightfria böcker i Opus",
	}
}

export const COLORS = ["primary", "secondary", "accent", "foreground"]

function Headers({ editions }: { editions: EditionReadingStatus[] }) {
	console.log(editions)
	return (
		<header
			className={`col-span-5 grid grid-cols-[28px_44px_repeat(${editions.length},minmax(0,1fr))] rounded-tl-xl border-b border-border bg-secondary text-bg items-center`}>
			<div className={"rounded-tl-4xl  font-display  text-bg"}></div>
			<div className={"py-4 px-2 pl-4 "}>#</div>
			{editions.map((ed, index) => (
				<div className={"  text-bg font-sm flex gap-2"} key={ed.id}>
					<div
						className={`w-1.5 border-l   border-surface bg-${COLORS[index]}`}></div>
					<span className={"py-4 px-2 font-sm font-display"}>{ed.title}</span>
				</div>
			))}
		</header>
	)
}

export default async function ({
	params,
}: {
	params: Promise<{ id: number }>
}) {
	const { id } = await params
	const [work, reading] = await Promise.all([
		workApi.retrieve(id),
		readingProgressApi.retrieve(id),
	])

	let meta = []

	if (work.contributors.length > 0) {
		meta.push(
			work.contributors
				.filter(c => c.role === "author")
				.map(c => c.author.name)
				.join(", "),
		)
	}

	if (work.year) {
		meta.push(work.year)
	}

	const positions = [
		...new Set(
			reading.editions.flatMap(edition =>
				edition.units.map(unit => unit.position),
			),
		),
	].sort((a, b) => a - b)

	const unitsByEdition = new Map(
		reading.editions.map(edition => [
			edition.id,
			new Map(edition.units.map(unit => [unit.position, unit])),
		]),
	)
	const workEditionsById = new Map(
		work.editions.map(edition => [edition.id, edition]),
	)

	return (
		<>
			<hr className={"border-border my-5 "} />
			<div className={"mt-9"}>
				<span
					className={
						"font-mono tracking-widest  text-sm uppercase text-primary"
					}>
					{meta.join(" · ")}
				</span>
				<h1 className={"font-display text-6xl"}>{work.title}</h1>
			</div>
			<div className={"flex justify-between flex-wrap"}>
				<div></div>
				<div className={"flex gap-2 flex-wrap"}>
					{work.editions.map((edition, i) => {
						return (
							<span
								key={edition.id}
								className={
									"text-sm border-border rounded-sm border py-1 px-2 bg-surface flex items-center gap-1.5"
								}>
								<svg width={10} height={10} viewBox={"0 0 15 15"}>
									<circle cx='5' cy={7} r={5} fill={`var(--${COLORS[i]})`} />
								</svg>
								{edition.title}
							</span>
						)
					})}
				</div>
			</div>
			<hr className={"border-border my-9 "} />

			<article className={`lg:grid grid-cols-6 hidden `}>
				<Headers editions={reading.editions} />
				<div
					className={
						"px-2 flex items-center font-mono col-span-1 text-sm uppercase text-center justify-between"
					}>
					<span>Marginalnotiser</span>
				</div>
				<section
					className={`col-span-5 grid grid-cols-[28px_44px_repeat(${reading.editions.length},minmax(0,1fr))] border  border-border  items-center`}>
					{positions.map((position, index) => {
						const units = reading.editions.map(edition =>
							unitsByEdition.get(edition.id)?.get(position),
						)
						const label = units.find(Boolean)?.label || position
						const annotations = reading.editions.flatMap(edition => {
							const unit = unitsByEdition.get(edition.id)?.get(position)

							return (unit?.annotations ?? []).map(annotation => ({
								annotation,
								editionTitle: edition.title,
							}))
						})
						return (
							<div key={index} className="group/row col-span-full grid grid-cols-subgrid bg-surface hover:bg-primary/[0.05] duration-200">
								<div></div>
								<div
									className={
										"font-mono text-text-muted text-sm border-r border-b border-border h-full items-center flex"
									}>
									{label}
								</div>
								{units.map((u, y) => {
									return (
										<Unit
											key={y}
											span={`${index}:${y}`}
											color={COLORS[y]}
											unit={u}
										/>
									)
								})}
							</div>
						)
					})}
					<p></p>
				</section>
			</article>
		</>
	)
}

{
	/**
	
				<table className='reading-table'>
					<thead>
            <tr>
              <th className='reading-gutter-heading'>
                #
              </th>
              {reading.editions.map((ed, index)=>{
                return <th
                  key={ed.id}
                  className={`reading-edition-heading edition-${COLORS[index]}`}
                  style={{ borderLeftColor: `var(--${COLORS[index]})` }}>
                  <span>{ed.title}</span>
                  <small>{workEditionsById.get(ed.id)?.edition}</small>
                </th>
              })}
              <th scope='col' className='reading-notes-heading'>Marginalnotiser</th>
            </tr>
          </thead>
					<tbody>
            {positions.map((position) => {
             

              return (
                <tr
                  key={position}
                  className={position === reading.position ? 'reading-row is-current' : 'reading-row'}>
                  <th scope='row' className='reading-row-label'>{label}</th>
                  {reading.editions.map((edition) => {
                    const unit = unitsByEdition.get(edition.id)?.get(position)

                    return (
                      <td key={edition.id} className='reading-cell' data-edition={edition.title}>
                        <span className='reading-cell-content'>
                          {unit?.label && <sup className='reading-reference'>{unit.label}</sup>}
                          {unit?.content}
                        </span>
                      </td>
                    )
                  })}
                  <td className='reading-notes-cell'>
                    {annotations.map(({ annotation, editionTitle }) => (
                      <article className='reading-note' key={annotation.id}>
                        <p className='reading-note-meta'>
                          Rad {label} · {editionTitle}
                        </p>
                        <p className='reading-note-body'>
                          {annotation.body || annotation.lexical_entry?.lemma || annotation.kind}
                        </p>
                      </article>
                    ))}
                  </td>
                </tr>
              )
            })}
          </tbody>
					<tfoot>
              <tr>
                <td colSpan={reading.editions.length + 2} className='reading-toolbar'>
                  <span>⋮⋮ &nbsp; Dra en rad för att justera</span>
                  <span>◌ &nbsp; Slå ihop / dela rader</span>
                  <button type='button'>Synka om från rad {reading.position}</button>
                </td>
              </tr>
					</tfoot>
				</table> */
}
