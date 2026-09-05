"use client"

import { Card } from "../../components/ui/Card"
import { useUpdateData } from "../_state/update-context"
import { ListChecks, ArrowUpRight } from "lucide-react"
import Link from "next/link"
export function UpdatesWidget() {
	const { updates } = useUpdateData()
	return (
		<Card className='col-span-1 h-full w-full !p-0 overflow-hidden lg:col-span-7'>
			<div className='flex items-center justify-between border-b border-border px-4.5 py-3.5'>
				<span className='flex items-center gap-2 text-sm font-medium text-text-muted'><ListChecks size={16} /> Senaste uppdateringar</span>
				<span className='text-xs text-text-faint'>{updates?.length ?? 0} st</span>
			</div>
			<div className='divide-y divide-border'>
			{updates?.length ? updates.slice(0, 2).map(u => {
				return (
					<Link key={u.id} href={`/updates/${u.id}`} className='group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4.5 py-3 no-underline transition-colors hover:bg-surface-2'>
						<div className='min-w-0'>
							<span className='block truncate text-sm font-medium text-text'>{u.title}</span>
							{u.content && <p className='mt-1 truncate text-sm text-text-muted'>{u.content}</p>}
						</div>
						<ArrowUpRight size={17} className='text-accent transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5' />
						</Link>
				)
			}) : <p className='px-4.5 py-6 text-sm text-text-muted'>Inga uppdateringar ännu.</p>}
			</div>
		</Card>
	)
}
