import type { User } from "./auth";

/* ============================================================================
   Primitiva typer
   ========================================================================== */

export type Id = number;
export type ISODateTime = string;
export type LanguageCode = string;
export type Nullable<T> = T | null;

/* ============================================================================
   Geme­nsamma unions
   ========================================================================== */

export type TextUnitKind = "chapter" | "paragraph" | "line";

export type ContributorRole =
  | "author"
  | "editor"
  | "translator"
  | "commentator";

export type AnnotationKind = string;

export type AlignmentStatus = string;
export type AlignmentMemberStatus = string;
export type AlignmentType = string;
export type ImportStatus = "pending" | "processing" | "completed" | "failed";

/* ============================================================================
   Shelves
   ========================================================================== */

export type Shelf = {
  id: Id;
  name: string;
};

export type ShelfCreate = {
  name: string;
};

export type ShelfUpdate = Partial<ShelfCreate>;

/* ============================================================================
   Authors
   ========================================================================== */

export type Author = {
  id: Id;
  name: string;
  born: string;
  died: string;
  biography: string;
  bibliography: string;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

export type AuthorCreate = {
  name: string;
  born?: string;
  died?: string;
  biography?: string;
  bibliography?: string;
};

export type AuthorUpdate = Partial<AuthorCreate>;

export type AuthorAlias = {
  id: Id;
  author: Id;
  name: string;
  language: string;
  is_preferred: boolean;
};

export type AuthorAliasCreate = {
  author: Id;
  name: string;
  language?: string;
  is_preferred?: boolean;
};

export type AuthorAliasUpdate = Partial<AuthorAliasCreate>;

export type AuthorIdentifierProvider =
  | "wikidata"
  | "viaf"
  | "openlibrary"
  | "loc";

export type AuthorIdentifier = {
  id: Id;
  author: Id;
  provider: AuthorIdentifierProvider;
  external_id: string;
  external_url: string;
  last_synced_at: Nullable<ISODateTime>;
};

export type AuthorIdentifierCreate = {
  author: Id;
  provider: AuthorIdentifierProvider;
  external_id: string;
  external_url?: string;
};

export type AuthorIdentifierUpdate = Partial<AuthorIdentifierCreate>;

/* ============================================================================
   Works, contributors och editions
   ========================================================================== */

export type WorkContributor = {
  id: Id;
  author: Author;
  role: ContributorRole;
  display_order: number;
};

export type WorkContributorCreate = {
  work: Id;
  author_id: Id;
  role?: ContributorRole;
  display_order?: number;
};

export type WorkContributorUpdate = Partial<
  Omit<WorkContributorCreate, "work">
>;

export type Edition = {
  id: Id;
  work: Id;
  title: string;
  language: LanguageCode;
  edition: string;
  source: string;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

export type EditionCreate = {
  work: Id;
  title: string;
  language: LanguageCode;
  edition?: string;
  source?: string;
};

export type EditionUpdate = Partial<Omit<EditionCreate, "work">>;

export type Work = {
  id: Id;
  title: string;
  year: string;
  owner: User["id"];
  is_private: boolean;
  shelves: Id[];
  shelf_names: string[];
  contributors: WorkContributor[];
  editions: Edition[];
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

export type WorkCreate = {
  title: string;
  year?: string;
  is_private?: boolean;
  shelves?: Id[];
};

export type WorkUpdate = Partial<WorkCreate>;

/* ============================================================================
   Bibliografi
   ========================================================================== */

export type BibliographyEntry = {
  id: Id;
  author: Id;
  work: Nullable<Id>;
  title: string;
  year: string;
  publisher: string;
  language: string;
  external_provider: string;
  external_id: string;
  source_url: string;
  note: string;
  sort_order: number;
};

export type BibliographyEntryCreate = {
  author: Id;
  work?: Nullable<Id>;
  title: string;
  year?: string;
  publisher?: string;
  language?: string;
  external_provider?: string;
  external_id?: string;
  source_url?: string;
  note?: string;
  sort_order?: number;
};

export type BibliographyEntryUpdate =
  Partial<BibliographyEntryCreate>;

/* ============================================================================
   Textenheter och dokument
   ========================================================================== */

export type TextUnit = {
  id: Id;
  version: Id;
  parent: Nullable<Id>;
  kind: TextUnitKind;
  position: number;
  content: string;
  label: string;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

export type TextUnitCreate = {
  version: Id;
  parent?: Nullable<Id>;
  kind: TextUnitKind;
  position: number;
  content: string;
  label?: string;
};

export type TextUnitUpdate = Partial<Omit<TextUnitCreate, "version">>;

export type SourceFile = {
  id: Id;
  version: Id;
  storage_key: string;
  original_filename: string;
  content_hash: string;
  file_type: string;
  import_status: ImportStatus;
  failure_detail: string;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

export type SourceFileCreate = Omit<
  SourceFile,
  "id" | "created_at" | "updated_at"
>;

export type SourceFileUpdate = Partial<Omit<SourceFileCreate, "version">>;

/* ============================================================================
   Lexikon och annotationer
   ========================================================================== */

export type LexicalEntry = {
  id: Id;
  lemma: string;
  language: LanguageCode;
  part_of_speech: string;
  gender: string;
  inflection_data: Record<string, unknown>;
};

export type LexicalEntryCreate = {
  lemma: string;
  language: LanguageCode;
  part_of_speech?: string;
  gender?: string;
  inflection_data?: Record<string, unknown>;
};

export type LexicalEntryUpdate = Partial<LexicalEntryCreate>;

export type Annotation = {
  id: Id;
  user: User["id"];
  unit: Id;
  lexical_entry: Nullable<Id>;
  start_offset: Nullable<number>;
  end_offset: Nullable<number>;
  kind: AnnotationKind;
  body: string;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

export type AnnotationCreate = {
  unit: Id;
  lexical_entry?: Nullable<Id>;
  start_offset?: Nullable<number>;
  end_offset?: Nullable<number>;
  kind: AnnotationKind;
  body?: string;
};

export type AnnotationUpdate = Partial<AnnotationCreate>;

/* Annotationer inbäddade i GET /api/opus/status/ */

export type ReadingAnnotation = {
  id: Id;
  kind: AnnotationKind;
  start_offset: Nullable<number>;
  end_offset: Nullable<number>;
  body: string;
  lexical_entry: Nullable<LexicalEntry>;
};

/* ============================================================================
   Läsning
   ========================================================================== */

export type ReadingProgressInput = {
  position: number;
  character_index?: Nullable<number>;
};

export type Bookmark = {
  id: Id;
  user: User["id"];
  version: Id;
  unit: Id;
  offset: Nullable<number>;
  title: string;
  note: string;
  created_at: ISODateTime;
};

export type BookmarkCreate = {
  version: Id;
  unit: Id;
  offset?: Nullable<number>;
  title?: string;
  note?: string;
};

export type BookmarkUpdate = Partial<BookmarkCreate>;

export type Excerpt = {
  id: Id;
  user: User["id"];
  version: Id;
  unit: Id;
  start_offset: Nullable<number>;
  end_offset: Nullable<number>;
  text_snapshot: string;
  title: string;
  note: string;
  created_at: ISODateTime;
};

export type ExcerptCreate = {
  version: Id;
  unit: Id;
  start_offset?: Nullable<number>;
  end_offset?: Nullable<number>;
  text_snapshot: string;
  title?: string;
  note?: string;
};

export type ExcerptUpdate = Partial<ExcerptCreate>;

/* ============================================================================
   Sammansatt status-DTO
   ========================================================================== */

export type ReadingUnit = {
  id: Id;
  kind: TextUnitKind;
  position: number;
  label: string;
  content: string;
  annotations: ReadingAnnotation[];
};

export type EditionReadingStatus = {
  id: Id;
  title: string;
  language: LanguageCode;
  status: string;
  status_percent: number;
  units: ReadingUnit[];
};

export type WorkReadingResponse = {
  work: Pick<Work, "id" | "title">;
  position: number;
  character_index: Nullable<number>;
  updated_at: Nullable<ISODateTime>;
  /** All visible editions are returned; this endpoint is not edition-paginated. */
  editions: EditionReadingStatus[];
};

/* ============================================================================
   Alignment
   ========================================================================== */

export type AlignmentSet = {
  id: Id;
  work: Nullable<Id>;
  owner: Nullable<User["id"]>;
  name: string;
  is_public: boolean;
  status: AlignmentStatus;
  source_version: Id;
  target_version: Id;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

export type AlignmentSetCreate = {
  work?: Nullable<Id>;
  name: string;
  is_public?: boolean;
  status?: AlignmentStatus;
  source_version: Id;
  target_version: Id;
};

export type AlignmentSetUpdate = Partial<
  Omit<AlignmentSetCreate, "work">
>;

export type AlignmentVersion = {
  id: Id;
  alignment_set: Id;
  text_version: Id;
  display_order: number;
  label: string;
  role: string;
};

export type AlignmentVersionCreate = {
  alignment_set: Id;
  text_version: Id;
  display_order?: number;
  label?: string;
  role?: string;
};

export type AlignmentVersionUpdate =
  Partial<Omit<AlignmentVersionCreate, "alignment_set">>;

export type AlignmentGroup = {
  id: Id;
  alignment_set: Id;
  sequence: number;
  label: string;
};

export type AlignmentGroupCreate = {
  alignment_set: Id;
  sequence: number;
  label?: string;
};

export type AlignmentGroupUpdate =
  Partial<Omit<AlignmentGroupCreate, "alignment_set">>;

export type AlignmentMember = {
  id: Id;
  group: Id;
  alignment_version: Id;
  start_unit: Nullable<Id>;
  end_unit: Nullable<Id>;
  status: Nullable<AlignmentMemberStatus>;
};

export type AlignmentMemberCreate = {
  group: Id;
  alignment_version: Id;
  start_unit?: Nullable<Id>;
  end_unit?: Nullable<Id>;
  status?: Nullable<AlignmentMemberStatus>;
};

export type AlignmentMemberUpdate =
  Partial<Omit<AlignmentMemberCreate, "group" | "alignment_version">>;

export type Alignment = {
  id: Id;
  alignment_set: Id;
  source_start: Nullable<string>;
  source_end: Nullable<string>;
  target_start: Nullable<string>;
  target_end: Nullable<string>;
  alignment_type: AlignmentType;
  confidence: Nullable<number>;
  source_unit: Nullable<Id>;
  target_unit: Nullable<Id>;
};

export type AlignmentCreate = Omit<Alignment, "id">;
export type AlignmentUpdate = Partial<AlignmentCreate>;

/* ============================================================================
   Filtertyper
   ========================================================================== */

export type WorkFilters = {
  owner?: string;
  is_private?: string;
  year?: string;
  year__icontains?: string;
  shelves?: string;
  title?: string;
  title__icontains?: string;
};

export type EditionFilters = {
  work?: string;
  language?: string;
  title?: string;
  title__icontains?: string;
};

export type ShelfFilters = {
  name?: string;
  name__icontains?: string;
};

export type AuthorFilters = {
  name?: string;
  name__icontains?: string;
  born?: string;
  born__icontains?: string;
  died?: string;
  died__icontains?: string;
};

export type AuthorAliasFilters = {
  author?: string;
  name?: string;
  name__icontains?: string;
  language?: string;
  is_preferred?: string;
};

export type AuthorIdentifierFilters = {
  author?: string;
  provider?: string;
  external_id?: string;
};

export type BibliographyEntryFilters = {
  author?: string;
  work?: string;
  year?: string;
  year__icontains?: string;
  language?: string;
  external_provider?: string;
  title?: string;
  title__icontains?: string;
};

export type WorkContributorFilters = {
  work?: string;
  author?: string;
  role?: string;
};

export type AnnotationFilters = {
  unit?: string;
  lexical_entry?: string;
  lexical_entry__isnull?: string;
  kind?: string;
};

export type LexicalEntryFilters = {
  language?: string;
  part_of_speech?: string;
  gender?: string;
  lemma?: string;
  lemma__icontains?: string;
};

export type BookmarkFilters = {
  user?: string;
  version?: string;
  unit?: string;
  title?: string;
  title__icontains?: string;
};

export type ExcerptFilters = BookmarkFilters;

export type AlignmentSetFilters = {
  work?: string;
  owner?: string;
  is_public?: string;
  status?: string;
};

export type AlignmentVersionFilters = {
  alignment_set?: string;
  text_version?: string;
};

export type AlignmentGroupFilters = {
  alignment_set?: string;
  sequence?: string;
};

export type AlignmentMemberFilters = {
  group?: string;
  alignment_version?: string;
  status?: string;
};

export type AlignmentFilters = {
  alignment_set?: string;
  source_unit?: string;
  target_unit?: string;
  alignment_type?: string;
  source_start?: string;
  source_start__gte?: string;
  source_start__lte?: string;
  source_end?: string;
  source_end__gte?: string;
  source_end__lte?: string;
  target_start?: string;
  target_start__gte?: string;
  target_start__lte?: string;
  target_end?: string;
  target_end__gte?: string;
  target_end__lte?: string;
  confidence?: string;
  confidence__gte?: string;
  confidence__lte?: string;
};
