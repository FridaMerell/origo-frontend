"use client"

import { useState } from "react"
import { BookmarkIcon, ChevronRightIcon, Trash2Icon } from "lucide-react"
import { Chip } from "@/app/components/ui/Chip"
import { Drawer, useDrawerClose } from "@/app/components/ui/Drawer"
import type { WorkBookmark } from "../../_actions/bookmark-actions"
import { removeBookmark } from "../../_actions/bookmark-actions"
import { requestUnitNavigation } from "../../_state/unit-navigation"

function BookmarkRows({ bookmarks }: { bookmarks: WorkBookmark[] }) {
	const closeDrawer = useDrawerClose()
	const [items, setItems] = useState(bookmarks)
	const [busyId, setBusyId] = useState<WorkBookmark["id"] | null>(null)

	if (items.length === 0) {
		return <p className='text-sm text-text-muted'>Inga bokmärken än. Klicka bokmärkesikonen i indexkolumnen för en rad.</p>
	}

	async function handleRemove(id: WorkBookmark["id"]) {
		setBusyId(id)
		try {
			await removeBookmark(id)
			setItems(prev => prev.filter(item => item.id !== id))
		} finally {
			setBusyId(null)
		}
	}

	return (
		<ol className='flex flex-col divide-y divide-border'>
			{items.map(bookmark => (
				<li key={bookmark.id} className='group flex items-center gap-2'>
					<button
						type='button'
						onClick={() => {
							requestUnitNavigation(bookmark.unitId)
							closeDrawer()
						}}
						className='flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left hover:bg-text/5 cursor-pointer'>
						<span className='min-w-0 flex-1'>
							<span className='block font-mono text-xs uppercase tracking-widest text-text-muted'>
								{bookmark.editionTitle} · {bookmark.label}
							</span>
							<span className='block truncate text-sm text-text'>{bookmark.snippet}</span>
						</span>
						<ChevronRightIcon
							size={14}
							className='shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100'
						/>
					</button>
					<button
						type='button'
						title='Ta bort bokmärke'
						aria-label='Ta bort bokmärke'
						disabled={busyId === bookmark.id}
						onClick={() => handleRemove(bookmark.id)}
						className='shrink-0 text-text-muted hover:text-primary disabled:opacity-40 cursor-pointer'>
						<Trash2Icon size={14} />
					</button>
				</li>
			))}
		</ol>
	)
}

export default function BookmarksList({ bookmarks }: { bookmarks: WorkBookmark[] }) {
	return (
		<Drawer
			triggerVariant={"unstyled"}
			triggerClassName={"cursor-pointer"}
			title='Bokmärken'
			trigger={
				<Chip variant={"neutral-active"} className={"border-border rounded-sm text-sm"}>
					<BookmarkIcon size={12} />
					Bokmärken{bookmarks.length > 0 ? ` (${bookmarks.length})` : ""}
				</Chip>
			}>
			<BookmarkRows bookmarks={bookmarks} />
		</Drawer>
	)
}
