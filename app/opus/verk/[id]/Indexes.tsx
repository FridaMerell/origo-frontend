"use client"

import { Button } from "@/app/components/ui/Button"
import { Drawer } from "@/app/components/ui/Drawer"
import { Edition, EditionReadingStatus, Work } from "@/app/lib/dal/opus"

export default function ({
	edition,
	color,
}: {
	edition: EditionReadingStatus
	color: string
}) {
  
	return (
		<Drawer
    triggerVariant={'unstyled'}
    triggerClassName={'cursor-pointer'}
			trigger={
				<span
					key={edition.id}
					className={
						"text-sm border-border rounded-sm border py-1 px-2 bg-surface flex items-center gap-1.5"
					}>
					<svg width={10} height={10} viewBox={"0 0 15 15"}>
						<circle cx='5' cy={7} r={5} fill={`var(--${color})`} />
					</svg>
					{edition.title}
				</span>
			}>
			{edition.chapters.map(c => {
				return <div className={'text-text'} key={c.id}>{c.label}</div>
			})}
		</Drawer>
	)
}
