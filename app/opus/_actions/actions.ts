import { fetchOrigoApi } from "@/app/lib/api-client"
import { authedJsonHeaders } from "@/app/lib/auth-headers"
import { cache } from "react"
import type {
	Alignment,
	AlignmentCreate,
	AlignmentFilters,
	AlignmentGroup,
	AlignmentGroupCreate,
	AlignmentGroupFilters,
	AlignmentGroupUpdate,
	AlignmentMember,
	AlignmentMemberCreate,
	AlignmentMemberFilters,
	AlignmentMemberUpdate,
	AlignmentSet,
	AlignmentSetCreate,
	AlignmentSetFilters,
	AlignmentSetUpdate,
	AlignmentUpdate,
	AlignmentVersion,
	AlignmentVersionCreate,
	AlignmentVersionFilters,
	AlignmentVersionUpdate,
	Author,
	AuthorAlias,
	AuthorAliasCreate,
	AuthorAliasFilters,
	AuthorAliasUpdate,
	AuthorCreate,
	AuthorFilters,
	AuthorIdentifier,
	AuthorIdentifierCreate,
	AuthorIdentifierFilters,
	AuthorIdentifierUpdate,
	AuthorUpdate,
	BibliographyEntry,
	BibliographyEntryCreate,
	BibliographyEntryFilters,
	BibliographyEntryUpdate,
	Annotation,
	AnnotationCreate,
	AnnotationFilters,
	AnnotationUpdate,
	Bookmark,
	BookmarkCreate,
	BookmarkFilters,
	BookmarkUpdate,
	Excerpt,
	ExcerptCreate,
	ExcerptFilters,
	ExcerptUpdate,
	LexicalEntry,
	LexicalEntryCreate,
	LexicalEntryFilters,
	LexicalEntryUpdate,
	SourceFile,
	SourceFileCreate,
	SourceFileUpdate,
	Shelf,
	ShelfCreate,
	ShelfFilters,
	ShelfUpdate,
	TextUnit,
	TextUnitCreate,
	TextUnitUpdate,
	Edition,
	EditionCreate,
	EditionFilters,
	EditionUpdate,
	Work,
	WorkCreate,
	WorkFilters,
	WorkUpdate,
	WorkContributor,
	WorkContributorCreate,
	WorkContributorFilters,
	WorkContributorUpdate,
	ReadingProgressInput,
	WorkReadingResponse,
} from "@/app/lib/dal/opus"
import { TENANTS } from "@/app/lib/tenant"

const API_BASE = '/api/opus'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
	try {


		const response = await fetchOrigoApi(API_BASE + path, {
			...init,
			headers: await authedJsonHeaders()

		})

		if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
		return response.status === 204
			? (undefined as T)
			: ((await response.json()) as T)
	} catch (e) {
		console.log(API_BASE + path)
		throw e
	}
}

function withQuery(
	path: string,
	filters: Record<string, string | undefined>,
): string {
	const params = new URLSearchParams()
	for (const [key, value] of Object.entries(filters)) {
		if (value !== undefined) params.set(key, value)
	}
	const query = params.toString()
	return query ? `${path}?${query}` : path
}

function cachedList<T, Filters extends Record<string, string | undefined> = Record<string, string | undefined>>(
	path: string,
) {
	const get = cache((query: string) => request<T[]>(query ? `${path}?${query}` : path))
	return (filters?: Filters) => get(filters ? withQuery("", filters).slice(1) : "")
}

function cachedRetrieve<T>(path: string) {
	return cache((id: number) => request<T>(`${path}${id}/`))
}

export const alignmentGroupApi = {
	list: cachedList<AlignmentGroup, AlignmentGroupFilters>("/alignment-groups/"),
	retrieve: cachedRetrieve<AlignmentGroup>("/alignment-groups/"),
	create: (data: AlignmentGroupCreate) =>
		request<AlignmentGroup>("/alignment-groups/", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (id: number, data: AlignmentGroupUpdate) =>
		request<AlignmentGroup>(`/alignment-groups/${id}/`, {
			method: "PATCH",
			body: JSON.stringify(data),
		}),
	remove: (id: number) =>
		request<void>(`/alignment-groups/${id}/`, { method: "DELETE" }),
}

export const alignmentMemberApi = {
	list: cachedList<AlignmentMember, AlignmentMemberFilters>("/alignment-members/"),
	retrieve: cachedRetrieve<AlignmentMember>("/alignment-members/"),
	create: (data: AlignmentMemberCreate) =>
		request<AlignmentMember>("/alignment-members/", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (id: number, data: AlignmentMemberUpdate) =>
		request<AlignmentMember>(`/alignment-members/${id}/`, {
			method: "PATCH",
			body: JSON.stringify(data),
		}),
	remove: (id: number) =>
		request<void>(`/alignment-members/${id}/`, { method: "DELETE" }),
}

export const alignmentSetApi = {
	list: cachedList<AlignmentSet, AlignmentSetFilters>("/alignment-sets/"),
	retrieve: cachedRetrieve<AlignmentSet>("/alignment-sets/"),
	create: (data: AlignmentSetCreate) =>
		request<AlignmentSet>("/alignment-sets/", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (id: number, data: AlignmentSetUpdate) =>
		request<AlignmentSet>(`/alignment-sets/${id}/`, {
			method: "PATCH",
			body: JSON.stringify(data),
		}),
	remove: (id: number) =>
		request<void>(`/alignment-sets/${id}/`, { method: "DELETE" }),
}

export const alignmentVersionApi = {
	list: cachedList<AlignmentVersion, AlignmentVersionFilters>("/alignment-versions/"),
	retrieve: cachedRetrieve<AlignmentVersion>("/alignment-versions/"),
	create: (data: AlignmentVersionCreate) =>
		request<AlignmentVersion>("/alignment-versions/", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (id: number, data: AlignmentVersionUpdate) =>
		request<AlignmentVersion>(`/alignment-versions/${id}/`, {
			method: "PATCH",
			body: JSON.stringify(data),
		}),
	remove: (id: number) =>
		request<void>(`/alignment-versions/${id}/`, { method: "DELETE" }),
}

export const alignmentApi = {
	list: cachedList<Alignment, AlignmentFilters>("/alignments/"),
	retrieve: cachedRetrieve<Alignment>("/alignments/"),
	create: (data: AlignmentCreate) =>
		request<Alignment>("/alignments/", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (id: number, data: AlignmentUpdate) =>
		request<Alignment>(`/alignments/${id}/`, {
			method: "PATCH",
			body: JSON.stringify(data),
		}),
	remove: (id: number) =>
		request<void>(`/alignments/${id}/`, { method: "DELETE" }),
}

export const annotationApi = {
	list: cachedList<Annotation, AnnotationFilters>("/annotations/"),
	retrieve: cachedRetrieve<Annotation>("/annotations/"),
	create: (data: AnnotationCreate) =>
		request<Annotation>("/annotations/", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (id: number, data: AnnotationUpdate) =>
		request<Annotation>(`/annotations/${id}/`, {
			method: "PATCH",
			body: JSON.stringify(data),
		}),
	remove: (id: number) =>
		request<void>(`/annotations/${id}/`, { method: "DELETE" }),
}

export const bookmarkApi = {
	list: cachedList<Bookmark, BookmarkFilters>("/bookmarks/"),
	retrieve: cachedRetrieve<Bookmark>("/bookmarks/"),
	create: (data: BookmarkCreate) =>
		request<Bookmark>("/bookmarks/", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (id: number, data: BookmarkUpdate) =>
		request<Bookmark>(`/bookmarks/${id}/`, {
			method: "PATCH",
			body: JSON.stringify(data),
		}),
	remove: (id: number) =>
		request<void>(`/bookmarks/${id}/`, { method: "DELETE" }),
}

export const excerptApi = {
	list: cachedList<Excerpt, ExcerptFilters>("/excerpts/"),
	retrieve: cachedRetrieve<Excerpt>("/excerpts/"),
	create: (data: ExcerptCreate) =>
		request<Excerpt>("/excerpts/", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (id: number, data: ExcerptUpdate) =>
		request<Excerpt>(`/excerpts/${id}/`, {
			method: "PATCH",
			body: JSON.stringify(data),
		}),
	remove: (id: number) =>
		request<void>(`/excerpts/${id}/`, { method: "DELETE" }),
}

export const lexicalEntryApi = {
	list: cachedList<LexicalEntry, LexicalEntryFilters>("/lexical-entries/"),
	retrieve: cachedRetrieve<LexicalEntry>("/lexical-entries/"),
	create: (data: LexicalEntryCreate) =>
		request<LexicalEntry>("/lexical-entries/", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (id: number, data: LexicalEntryUpdate) =>
		request<LexicalEntry>(`/lexical-entries/${id}/`, {
			method: "PATCH",
			body: JSON.stringify(data),
		}),
	remove: (id: number) =>
		request<void>(`/lexical-entries/${id}/`, { method: "DELETE" }),
}

export const readingProgressApi = {
	retrieve: cache((workId: number) =>
		request<WorkReadingResponse>(`/read/${workId}/`),
	),
	update: (workId: number, data: ReadingProgressInput) =>
		request<WorkReadingResponse>(`/read/${workId}/progress/`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),
}

export const sourceFileApi = {
	list: cachedList<SourceFile>("/source-files/"),
	retrieve: cachedRetrieve<SourceFile>("/source-files/"),
	create: (data: SourceFileCreate) =>
		request<SourceFile>("/source-files/", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (id: number, data: SourceFileUpdate) =>
		request<SourceFile>(`/source-files/${id}/`, {
			method: "PATCH",
			body: JSON.stringify(data),
		}),
	remove: (id: number) =>
		request<void>(`/source-files/${id}/`, { method: "DELETE" }),
}

export const textUnitApi = {
	list: cachedList<TextUnit>("/text-units/"),
	retrieve: cachedRetrieve<TextUnit>("/text-units/"),
	create: (data: TextUnitCreate) =>
		request<TextUnit>("/text-units/", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (id: number, data: TextUnitUpdate) =>
		request<TextUnit>(`/text-units/${id}/`, {
			method: "PATCH",
			body: JSON.stringify(data),
		}),
	remove: (id: number) =>
		request<void>(`/text-units/${id}/`, { method: "DELETE" }),
}

export const editionApi = {
	list: cachedList<Edition, EditionFilters>("/editions/"),
	retrieve: cachedRetrieve<Edition>("/editions/"),
	create: (data: EditionCreate) =>
		request<Edition>("/editions/", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (id: number, data: EditionUpdate) =>
		request<Edition>(`/editions/${id}/`, {
			method: "PATCH",
			body: JSON.stringify(data),
		}),
	remove: (id: number) =>
		request<void>(`/editions/${id}/`, { method: "DELETE" }),
}


export const workApi = {
	list: cachedList<Work, WorkFilters>("/works/"),
	retrieve: cachedRetrieve<Work>("/works/"),
	create: (data: WorkCreate) =>
		request<Work>("/works/", {
			method: "POST",
			body: JSON.stringify(data),
		}),

	createWithEditions: async (
		workDetails: NewWorkDetails,
		editions: NewTextVersion[],
	): Promise<CreateWorkResult> => {
		const title = workDetails.title.trim()
		const year = workDetails.year.trim()

		if (!title) {
			return { error: "Ange verkets titel." }
		}

		if (editions.length === 0) {
			return { error: "Lägg till minst en utgåva." }
		}

		const normalizedEditions = editions.map((edition) => ({
			title: edition.title.trim(),
			language:
				edition.customLanguage.trim() ||
				edition.language.trim(),
			edition: edition.edition.trim(),
			source: edition.source.trim(),
		}))

		if (
			normalizedEditions.some(
				(edition) => !edition.title || !edition.language,
			)
		) {
			return {
				error: "Varje utgåva behöver titel och språk.",
			}
		}

		try {
			const work = await request<Work>(
				"/works/create-with-editions/",
				{
					method: "POST",
					body: JSON.stringify({
						title,
						year: year || undefined,
						is_private: workDetails.isPrivate,
						shelves: workDetails.shelves,
						author: workDetails.author.trim() || undefined,
						editions: normalizedEditions,
					}),
				},
			)

			return {
				work,
				editions: work.editions.map((edition) => ({
					id: edition.id,
					title: edition.title,
				})),
			}
		} catch {
			return {
				error:
					"Verket och utgåvorna kunde inte sparas. Försök igen.",
			}
		}
	},

	update: (id: number, data: WorkUpdate) =>
		request<Work>(`/works/${id}/`, {
			method: "PATCH",
			body: JSON.stringify(data),
		}),

	remove: (id: number) =>
		request<void>(`/works/${id}/`, {
			method: "DELETE",
		}),
}
export const shelfApi = {
	list: cachedList<Shelf, ShelfFilters>("/shelves/"),
	retrieve: cachedRetrieve<Shelf>("/shelves/"),
	create: (data: ShelfCreate) => request<Shelf>("/shelves/", { method: "POST", body: JSON.stringify(data) }),
	update: (id: number, data: ShelfUpdate) => request<Shelf>(`/shelves/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
	remove: (id: number) => request<void>(`/shelves/${id}/`, { method: "DELETE" }),
}

export const authorApi = {
	list: cachedList<Author, AuthorFilters>("/authors/"),
	retrieve: cachedRetrieve<Author>("/authors/"),
	create: (data: AuthorCreate) => request<Author>("/authors/", { method: "POST", body: JSON.stringify(data) }),
	update: (id: number, data: AuthorUpdate) => request<Author>(`/authors/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
	remove: (id: number) => request<void>(`/authors/${id}/`, { method: "DELETE" }),
}

export const authorAliasApi = {
	list: cachedList<AuthorAlias, AuthorAliasFilters>("/author-aliases/"),
	retrieve: cachedRetrieve<AuthorAlias>("/author-aliases/"),
	create: (data: AuthorAliasCreate) => request<AuthorAlias>("/author-aliases/", { method: "POST", body: JSON.stringify(data) }),
	update: (id: number, data: AuthorAliasUpdate) => request<AuthorAlias>(`/author-aliases/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
	remove: (id: number) => request<void>(`/author-aliases/${id}/`, { method: "DELETE" }),
}

export const authorIdentifierApi = {
	list: cachedList<AuthorIdentifier, AuthorIdentifierFilters>("/author-identifiers/"),
	retrieve: cachedRetrieve<AuthorIdentifier>("/author-identifiers/"),
	create: (data: AuthorIdentifierCreate) => request<AuthorIdentifier>("/author-identifiers/", { method: "POST", body: JSON.stringify(data) }),
	update: (id: number, data: AuthorIdentifierUpdate) => request<AuthorIdentifier>(`/author-identifiers/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
	remove: (id: number) => request<void>(`/author-identifiers/${id}/`, { method: "DELETE" }),
}

export const bibliographyEntryApi = {
	list: cachedList<BibliographyEntry, BibliographyEntryFilters>("/bibliography-entries/"),
	retrieve: cachedRetrieve<BibliographyEntry>("/bibliography-entries/"),
	create: (data: BibliographyEntryCreate) => request<BibliographyEntry>("/bibliography-entries/", { method: "POST", body: JSON.stringify(data) }),
	update: (id: number, data: BibliographyEntryUpdate) => request<BibliographyEntry>(`/bibliography-entries/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
	remove: (id: number) => request<void>(`/bibliography-entries/${id}/`, { method: "DELETE" }),
}

export const workContributorApi = {
	list: cachedList<WorkContributor, WorkContributorFilters>("/work-contributors/"),
	retrieve: cachedRetrieve<WorkContributor>("/work-contributors/"),
	create: (data: WorkContributorCreate) => request<WorkContributor>("/work-contributors/", { method: "POST", body: JSON.stringify(data) }),
	update: (id: number, data: WorkContributorUpdate) => request<WorkContributor>(`/work-contributors/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
	remove: (id: number) => request<void>(`/work-contributors/${id}/`, { method: "DELETE" }),
}

export type NewTextVersion = {
	title: string
	language: string
	customLanguage: string
	edition: string
	source: string
}

export type NewWorkDetails = {
	title: string
	author: string
	year: string
	isPrivate: boolean
	shelves: number[]
}

export type CreateWorkResult = { work?: Work; editions?: { id: number; title: string }[]; error?: string }
