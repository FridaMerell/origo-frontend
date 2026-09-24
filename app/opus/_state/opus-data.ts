
import { workApi } from "../_actions/actions"
import { cookies } from "next/headers"

const CURRENT_WORK_COOKIE='opus_currently_reading'
const CURRENT_PAGE_COOKIE= 'opus_open_page'

export async function getSelectedWork() {
	const [works, cookieStore] = await Promise.all([
		workApi.list(),
		cookies(),
	])
	const selectedId = cookieStore.get(CURRENT_WORK_COOKIE)?.value
	return (
		works.find(f => String(f.id) === selectedId) ?? null
	)
}