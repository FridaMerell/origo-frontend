"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import AnnotationCard from "./AnnotationCard"
import { ReadingAnnotation } from "@/app/lib/dal/opus"

type AnnotationEntry = {
	annotation: ReadingAnnotation
	editionTitle: string
	label: string | number
}

type RowData = {
	position: number
	annotations: AnnotationEntry[]
}

export default function AnnotationColumn({
	rows,
	onDelete,
	onEdit,
}: {
	rows: RowData[]
	onDelete?: (annotationId: number) => void
	onEdit?: (annotationId: number, body: string) => Promise<void>
}) {
	const containerRef = useRef<HTMLDivElement>(null)
	const [tops, setTops] = useState<Record<number, number>>({})
	const [hovered, setHovered] = useState<number | null>(null)

	const measure = useCallback(() => {
		const container = containerRef.current
		if (!container) return
		const article = container.closest("article")
		if (!article) return
		const containerTop = container.getBoundingClientRect().top
		const newTops: Record<number, number> = {}
		for (const row of rows) {
			const rowEl = article.querySelector(`[data-position="${row.position}"]`)
			if (rowEl) {
				newTops[row.position] = rowEl.getBoundingClientRect().top - containerTop
			}
		}
		setTops(newTops)
	}, [rows])

	useEffect(() => {
		measure()
		const observer = new ResizeObserver(measure)
		const article = containerRef.current?.closest("article")
		if (article) observer.observe(article)
		return () => observer.disconnect()
	}, [measure])

	useEffect(() => {
		const article = containerRef.current?.closest("article")
		if (!article) return
		const cleanups: Array<() => void> = []
		for (const row of rows) {
			const rowEl = article.querySelector(`[data-position="${row.position}"]`)
			if (!rowEl) continue
			const enter = () => setHovered(row.position)
			const leave = () => setHovered(p => p === row.position ? null : p)
			rowEl.addEventListener("mouseenter", enter)
			rowEl.addEventListener("mouseleave", leave)
			cleanups.push(() => {
				rowEl.removeEventListener("mouseenter", enter)
				rowEl.removeEventListener("mouseleave", leave)
			})
		}
		return () => cleanups.forEach(fn => fn())
	}, [rows])

	return (
		<div ref={containerRef} className={"relative h-full"}>
			{rows.map((row) => (
				<div
					key={row.position}
					className={"absolute left-0 right-0 pl-5 pr-2 py-2"}
					style={{ top: tops[row.position] ?? 0 }}>
					<div className={"absolute left-0 top-6 h-px w-5 bg-border"} />
					<AnnotationCard
						annotations={row.annotations}
						highlighted={hovered === row.position}
						onDelete={onDelete}
						onEdit={onEdit}
					/>
				</div>
			))}
		</div>
	)
}
