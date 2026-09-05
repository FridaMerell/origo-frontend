import type { QueryParams } from "@/app/lib/dal/client"
import { fetchPage, paginationQuery as genericPaginationQuery, type Page } from "@/app/lib/dal/pagination"

export type TempusListParams = QueryParams
export type TempusPage<T> = Page<T>

export const fetchTempusPage = fetchPage
export const paginationQuery = genericPaginationQuery
