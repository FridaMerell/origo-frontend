"use client"

import { Card } from "../../components/ui/Card"
import { useUpdateData } from "../_state/update-context"
import { useUsers, getUserLabel } from "../../lib/user-context"
import { ListChecks, ArrowUpRight } from "lucide-react"
import Link from "next/link"
export function UpdatesWidget() {
	const { updates } = useUpdateData()
	const users = useUsers()
	return (
		<Card className='col-span-1 flex min-h-80 flex-col gap-0 p-0 lg:col-span-7'>
			<div className='flex items-center justify-between border-b border-border px-5 py-4'>
				<span className='flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent'>
					<ListChecks size={14} />
					Senaste uppdateringarna
				</span>
				<Link href="/updates" className='text-xs font-semibold text-link hover:text-link-hover'>
					Visa alla
				</Link>
			</div>
			<div className='flex flex-col'>
			{updates.slice(0, 4).map(u => {
				return (
					<Link key={u.id} href={`/updates/${u.id}`} className='group flex items-center gap-4 border-b border-border px-5 py-4 last:border-b-0 hover:bg-accent-wash'>
						<div className='min-w-0 flex-1'>
							<div className='flex items-baseline justify-between gap-3'>
								<span className='truncate font-display text-lg font-semibold text-text group-hover:text-accent'>{u.title}</span>
								<span className='shrink-0 text-xs text-text-faint'>{getUserLabel(users, u.author)}</span>
							</div>
							{u.content && <p className='mt-1 line-clamp-1 text-sm text-text-muted'>{u.content}</p>}
						</div>
						<ArrowUpRight size={16} className='shrink-0 text-text-faint transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent' />
					</Link>
				)
			})}
			{updates.length === 0 && <p className='px-5 py-8 text-sm text-text-muted'>Inga uppdateringar ännu.</p>}
			</div>
		</Card>
	)
}
