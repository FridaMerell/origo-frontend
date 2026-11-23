"use client"

import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"
import type { Id } from "@/app/lib/dal/opus"
import { Drawer } from "@/app/components/ui/Drawer"
import { BAR_CLASS } from "../_ui/editions"
import { CheckboxField } from "../../../forms/Fields/Fields"
import type { ColumnItem } from "./useColumnLayout"

/** Väljer vilka utgåvor läsvyn visar och i vilken ordning. Valet sparas i webbläsaren. */
export default function ColumnPicker({
	items,
	onToggle,
	onMove,
}: {
	items: ColumnItem[]
	onToggle: (editionId: Id) => void
	onMove: (editionId: Id, step: -1 | 1) => void
}) {
	const visibleCount = items.filter(item => item.visible).length
	const arrow = "rounded p-1 text-text-muted hover:bg-text/10 hover:text-text disabled:opacity-30 cursor-pointer"

	return (
		<Drawer triggerVariant={"paper-bordered"} triggerSize={"sm"} trigger={"Utgåvor"} title={"Utgåvor i läsvyn"}>
			<p className='mb-3 text-xs text-text-muted'>Välj vilka utgåvor som visas och i vilken ordning. Minst en utgåva visas.</p>
			<ol className='flex flex-col'>
				{items.map((item, index) => (
					<li key={item.column.editionId} className='flex items-center gap-2 border-b border-border py-2'>
						<span className={`h-2 w-2 shrink-0 rounded-full ${BAR_CLASS[item.column.color] ?? BAR_CLASS.foreground}`} />
						<div className='min-w-0 flex-1'>
							<CheckboxField
								label={item.column.title}
								checked={item.visible}
								disabled={item.visible && visibleCount === 1}
								onChange={() => onToggle(item.column.editionId)}
							/>
						</div>
						<button
							type='button'
							aria-label={`Flytta ${item.column.title} uppåt`}
							disabled={index === 0}
							onClick={() => onMove(item.column.editionId, -1)}
							className={arrow}>
							<ChevronUpIcon size={16} />
						</button>
						<button
							type='button'
							aria-label={`Flytta ${item.column.title} nedåt`}
							disabled={index === items.length - 1}
							onClick={() => onMove(item.column.editionId, 1)}
							className={arrow}>
							<ChevronDownIcon size={16} />
						</button>
					</li>
				))}
			</ol>
		</Drawer>
	)
}
