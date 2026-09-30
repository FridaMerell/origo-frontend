import { Metadata } from "next"
import { listAllBookmarks } from "../_actions/bookmark-actions"
import BookmarksView from "./BookmarksView"

export const metadata: Metadata = {
	title: "Bokmärken | Origo Opus",
	description: "Dina bokmärken i alla verk och utgåvor",
}

export default async function BookmarksPage() {
	const bookmarks = await listAllBookmarks()
	return <BookmarksView bookmarks={bookmarks} />
}
