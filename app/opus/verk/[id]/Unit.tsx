"use client"
import { ReadingUnit } from "@/app/lib/dal/opus"
import React, { useState } from "react"
import { COLORS } from "./page"


type UnitProps = {
  color:string
	span: string
	unit: ReadingUnit | undefined
}
export default function Unit({ span, unit,color }: UnitProps) {
	const [controlsOpen, setControlsOpen] = useState<boolean>(false)
	const borderColorClass = ({
		primary: "border-l-primary/50 group-hover/row:border-l-primary",
		secondary: "border-l-secondary/50 group-hover/row:border-l-secondary",
		accent: "border-l-accent/50 group-hover/row:border-l-accent",
		foreground: "border-l-foreground/50 group-hover/row:border-l-foreground",
	} as Record<string, string>)[color] ?? "border-l-foreground/50 group-hover/row:border-l-foreground"
	return (
		<React.Fragment>
			<div className={`px-3 duration-200 py-4 border-r border-b border-border border-l-5 h-full ${borderColorClass}`}>
				<button
        popoverTarget={span}
					onClick={() => setControlsOpen(!controlsOpen)}
					className={
						"font-mono cursor-pointer text-xs text-text-faint opacity-100 dark:opacity-70 pr-1 pb-1"
					}>
					{span}
				</button>
        <div popover={'auto'} id={span}></div>
				{unit?.content}
			</div>
		</React.Fragment>
	)
}
