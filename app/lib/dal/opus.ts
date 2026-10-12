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

/** One entry per edition, derived on retrieve; see WorkSerializer.get_index. Not TextUnit[] — that
 *  would flatten every edition's chapters into one list and lose which edition each belongs to. */
export type WorkIndexChapter = {
  id: Id;
  position: number;
  label: string;
};

export type WorkIndexEntry = {
  edition_id: Id;
  edition_title: string;
  chapters: WorkIndexChapter[];
};

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
  index: WorkIndexEntry[];
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

/** One reading unit per sentence (prose) or per line (verse, drama). */
export type ImportSegmentation = "sentences" | "lines";

/** Form fields sent with a file to preview-document, preview-import and import-document. */
export type ImportOptions = {
  segmentation: ImportSegmentation;
  /** Text ahead of the first numbered chapter (foreword, colophon…). */
  front_matter: "keep" | "skip";
  /** The chapter's name when the file has no chapter headings (blank: the file name). */
  label: string;
};

/** Matches opus/services/importing.py's document_preview(). Returned by EditionViewSet's
 *  preview-document and preview-import actions, and nested under ImportResult.preview from
 *  import-document. */
export type ImportPreviewChapter = {
  position: number;
  label: string;
  paragraph_count: number;
  preview: string;
  front_matter: boolean;
};

export type ImportPreview = {
  /** Null from preview-document, where the edition doesn't exist yet. */
  edition: Nullable<Pick<Edition, "id" | "title" | "language">>;
  segmentation: ImportSegmentation;
  paragraph_count: number;
  chapter_count: number;
  /** False when the file has no chapter headings and becomes one chapter named by `label`. */
  has_headings: boolean;
  /** Leading chapters ahead of the first numbered chapter; 0 when skipped or absent. */
  front_matter_count: number;
  preview_truncated: boolean;
  chapters: ImportPreviewChapter[];
};

/** Returned by EditionViewSet's import-document action (POST .../editions/{id}/import-document/). */
export type ImportResult = {
  source_file: SourceFile;
  paragraph_count: number;
  chapter_count: number;
  preview: ImportPreview;
};

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
  /** Kort översättning som visas i glosförhör; `definition` är den längre förklaringen. */
  translation: string;
  definition: string;
  /** Korta taggar som "ålderdomlig" eller "formell"; `connotation_note` förklarar dem. */
  connotations: string[];
  connotation_note: string;
  /** Ord med samma eller nästan samma betydelse; sökbara. */
  synonyms: LexicalSynonym[];
  /** Null för poster från innan poster hade ägare. */
  owner: Nullable<User["id"]>;
  /** Den inloggade användarens egna ordlistor som innehåller ordet. */
  glossaries: Id[];
  /** Stavningsvarianter och böjda former som hör till ordet. */
  forms: LexicalForm[];
  /** Om den inloggade användaren har markerat ordet för sina glosförhör. */
  in_quiz: boolean;
  /**
   * Om användaren får ändra ordet, enligt servern: egna ord, och ägarlösa ord från innan ord hade
   * ägare som användaren får ta över.
   */
  can_edit: boolean;
};

/** Ett synonymord; `target` pekar på ordet i lexikonet när synonymen också är ett eget ord. */
export type LexicalSynonym = {
  /** Null för en synonym sparad som lista innan synonymer fick en egen tabell. */
  id: Nullable<Id>;
  text: string;
  target: Nullable<Id>;
  target_lemma: Nullable<string>;
};

/** En synonym som skickas till API:t; hela listan ersätter ordets synonymer. */
export type LexicalSynonymInput = { text: string; target?: Nullable<Id> };

export type LexicalEntryCreate = {
  lemma: string;
  language: LanguageCode;
  part_of_speech?: string;
  gender?: string;
  inflection_data?: Record<string, unknown>;
  translation?: string;
  definition?: string;
  connotations?: string[];
  connotation_note?: string;
  synonyms?: LexicalSynonymInput[];
};

export type LexicalEntryUpdate = Partial<LexicalEntryCreate>;

/** GET /lexical-entries/languages/: språken bland användarens egna ord. */
export type LexicalLanguage = {
  language: LanguageCode;
  count: number;
  /** Hur många av orden användaren har markerat för glosförhör. */
  marked: number;
};

export type LexicalFormKind = "spelling" | "inflection";

/** De strukturerade grammatiska egenskaperna hos en böjd form; tom sträng när de inte är angivna. */
export type FormGrammar = {
  grammatical_case: string;
  number: string;
  person: string;
  tense: string;
  mood: string;
  voice: string;
  degree: string;
  definiteness: string;
};

/** En stavningsvariant eller böjd form knuten till ett ords grundform. */
export type LexicalForm = FormGrammar & {
  id: Id;
  entry: Id;
  form: string;
  kind: LexicalFormKind;
  /** Fri anteckning vid de strukturerade egenskaperna, t.ex. "pres. ind. 3 sg.". */
  inflection: string;
  /** Kopplingen till grundformen är osäker. */
  is_uncertain: boolean;
  /** Textstället där formen hittades. */
  unit: Nullable<Id>;
  /** Var textstället ligger; null utan textställe eller i någon annans privata verk. */
  source: Nullable<{
    work: Pick<Work, "id" | "title">;
    edition_title: string;
    chapter: Nullable<{ id: Id; label: string }>;
  }>;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

export type LexicalFormCreate = Partial<FormGrammar> & {
  entry: Id;
  form: string;
  kind?: LexicalFormKind;
  inflection?: string;
  is_uncertain?: boolean;
  unit?: Nullable<Id>;
};

export type LexicalFormUpdate = Partial<LexicalFormCreate>;

/** En ordlista: offentlig, eller privat för ägaren, som ett verk. */
export type Glossary = {
  id: Id;
  title: string;
  description: string;
  owner: User["id"];
  is_private: boolean;
  entry_count: number;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

/**
 * GET /glossaries/{id}/ (och svaret på create/update). Orden hämtas en sida i taget från
 * /lexical-entries/?glossaries={id}.
 */
export type GlossaryDetail = Glossary & {
  /** Hur många av ordlistans ord användaren har markerat för glosförhör. */
  marked_count: number;
};

/** GET /lexical-entries/: en sida ord, ordnade efter grundform. */
export type LexicalEntryPage = {
  results: LexicalEntry[];
  /** Antal ord som matchar filtren, över alla sidor. */
  count: number;
  next: Nullable<string>;
  previous: Nullable<string>;
};

export type GlossaryCreate = {
  title: string;
  description?: string;
  is_private?: boolean;
};

export type GlossaryUpdate = Partial<GlossaryCreate>;

export type AnnotationTargetKind = "word" | "phrase" | "unit";

export type Annotation = {
  id: Id;
  user: User["id"];
  unit: Id;
  target_kind: AnnotationTargetKind;
  lexical_entry: Nullable<Id>;
  start_offset: Nullable<number>;
  end_offset: Nullable<number>;
  kind: AnnotationKind;
  body: string;
  created_at: ISODateTime;
  updated_at: ISODateTime;
  /** Read-only context, so a list of annotations can be shown without fetching each unit. */
  work: Pick<Work, "id" | "title">;
  edition_title: string;
  chapter: Nullable<{ id: Id; label: string }>;
  /** The annotated word or phrase; empty for a whole-unit annotation. */
  target_text: string;
  /** The unit's text, cut at 280 characters. */
  excerpt: string;
  /** The linked lexical entry's data. */
  entry: Nullable<Omit<LexicalEntry, "gender" | "glossaries" | "forms" | "in_quiz">>;
};

export type AnnotationCreate = {
  unit: Id;
  target_kind: AnnotationTargetKind;
  lexical_entry?: Nullable<Id>;
  start_offset?: Nullable<number>;
  end_offset?: Nullable<number>;
  kind: AnnotationKind;
  body?: string;
};

export type AnnotationUpdate = Partial<AnnotationCreate>;

export type AnnotationOrdering = "text" | "updated" | "alphabetical";

/** GET /api/opus/annotations/: en sida, plus underlaget till listans filter. */
export type AnnotationPage = {
  results: Annotation[];
  /** Antal som matchar filtren, över alla sidor. */
  count: number;
  next: Nullable<string>;
  previous: Nullable<string>;
  page_size: number;
  /** Alla användarens annotationer, ofiltrerat. */
  total: number;
  /** Verken som har annotationer, i titelordning. */
  works: Pick<Work, "id" | "title">[];
  /** Antal per typ, i det valda verket. */
  kinds: Record<AnnotationKind, number>;
};

/* Annotationer inbäddade i GET /api/opus/status/ */

export type ReadingAnnotation = {
  id: Id;
  kind: AnnotationKind;
  start_offset: Nullable<number>;
  end_offset: Nullable<number>;
  body: string;
  lexical_entry: Nullable<ReadingEntry>;
};

/** En form som den följer med ett ord i läsvyns data. */
export type ReadingForm = Pick<
  LexicalForm,
  "id" | "form" | "kind" | "inflection" | "is_uncertain" | keyof FormGrammar
>;

/**
 * Ett ord i läsvyns data, med allt ordpanelen visar och ändrar (ordlistor, former, synonymer),
 * så att panelen inte behöver hämta ordet när den öppnas. En hel `LexicalEntry` duger också.
 */
export type ReadingEntry = Omit<LexicalEntry, "owner" | "forms" | "in_quiz"> & { forms: ReadingForm[] };

/**
 * Ett känt ord som hittats i styckets text: ett eget ord eller ett ur en synlig ordlista.
 * Sparas inte per textställe, till skillnad från en annotation.
 */
export type ReadingGloss = {
  start_offset: number;
  end_offset: number;
  /** Bara ägaren kan ändra eller ta bort ordet. */
  lexical_entry: ReadingEntry & Pick<LexicalEntry, "owner">;
  /** Satt när ordet i texten är en stavningsvariant eller böjd form, inte grundformen. */
  form: Nullable<ReadingForm>;
};

/* ============================================================================
   Läsning
   ========================================================================== */

export type ReadingProgressInput = {
  position: number;
  character_index?: Nullable<number>;
};

/** GET /reading-progress/ (list/retrieve): a reading position and where it points. */
export type ReadingProgressOverview = {
  id: Id;
  user: User["id"];
  work: Id;
  work_title: string;
  position: number;
  character_index: Nullable<number>;
  updated_at: ISODateTime;
  /** The edition whose numbering the position uses (the first column of the reader's grid). */
  edition: Nullable<{ id: Id; title: string }>;
  /** The unit at the position; null when the position is past the end of the edition. */
  unit: Nullable<{ id: Id; excerpt: string; chapter: Nullable<{ id: Id; label: string }> }>;
  percent: number;
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
  /** Read-only context, so a list of bookmarks can be shown without fetching each unit. */
  work: Pick<Work, "id" | "title">;
  edition_title: string;
  chapter: Nullable<{ id: Id; label: string }>;
  /** The bookmarked text, cut at 280 characters. */
  excerpt: string;
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
  /** Known words in the text outside the annotations; empty outside the alignment matrix. */
  glosses: ReadingGloss[];
  /** The chapter the unit belongs to, when it is in one. */
  chapter?: Nullable<{ id: Id; position: number; label: string }>;
  /** Alignment matrix only: the unit opens its chapter (show the chapter heading above it). */
  starts_chapter?: boolean;
  /** Alignment matrix only: labels of chapters without text placed directly ahead of this one. */
  empty_chapters_before?: string[];
};

/** A top-level chapter of an edition, as returned by the chapter endpoints. */
export type EditionChapter = { id: Id; position: number; label: string };

export type EditionReadingStatus = {
  id: Id;
  title: string;
  language: LanguageCode;
  status: string;
  status_percent: number;
  units: ReadingUnit[];
  chapters:TextUnit[]
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
  /** Legacy-fält från den parvisa alignment-modellen. Flux "Origo Opus" REFERENCE —
   *  Alignment-API: detaljkontrakt visar create utan dessa; skicka bara om du faktiskt
   *  vill sätta dem. */
  source_version?: Id;
  target_version?: Id;
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

/**
 * Flux "Origo Opus" — AlignmentMatrix: det parallella rutnätet. Varje edition är en kolumn
 * av celler; en rad är en AlignmentGroup och en cell är editionens member i den raden.
 * En lucka är en cell utan member (`member: null`, inga `units`).
 */
export type AlignmentCellKind = "text" | "gap" | "end";

export type AlignmentCell = {
  alignment_version: Id;
  /** text: ett eller flera stycken. gap: tom cell inne i editionen. end: editionen har inga fler stycken. */
  kind: AlignmentCellKind;
  units: ReadingUnit[];
};

export type AlignmentRow = {
  /** Radnummer (0-baserat). Cellen identifieras av edition + rad. */
  row: number;
  cells: AlignmentCell[];
};

export type AlignmentMatrix = {
  set: AlignmentSet;
  /** Kolumnordning; samma ordning som `cells` i varje rad. */
  versions: AlignmentVersion[];
  total_rows: number;
  offset: number;
  /** Bara vid `focus=reading`: raden som motsvarar sparad läsposition (fönstret börjar strax ovanför). */
  focus_row?: number;
  has_more: boolean;
  /** First row of every page; a chapter of the reference edition always starts a new page. */
  pages?: number[];
  rows: AlignmentRow[];
  /** Bara efter auto-match-chapters. */
  result?: AutoMatchChaptersResult;
};

export type AlignmentShiftAction = "insert_gap" | "remove_gap";

/** En uppradad grupp i planen: slutlig rad (0-baserad) och antal luckor som läggs in per edition (versions-id). */
export type AlignmentPlanGroup = {
  /** Gruppens plats i det som skickades in. */
  index: number;
  row: number;
  gaps: Record<string, number>;
};

/**
 * `result` i rutnätssvar. Automatisk kapitelsynk ger aligned_chapters. Manuell uppradning ger
 * planen (groups) och `dry_run`; vid torrkörning finns `first_row` i stället för `row`, och
 * ingenting har sparats.
 */
export type AutoMatchChaptersResult = {
  aligned_chapters?: number;
  inserted_gaps: number;
  row?: number;
  first_row?: number;
  dry_run?: boolean;
  groups?: AlignmentPlanGroup[];
};

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
  work?: string;
  /** Söker i ordet, förklaringen, modern form, synonymer, verk, utgåva och kapitel. */
  search?: string;
  /** Ordning inom ett verk; listan är alltid ordnad per verk först. */
  ordering?: AnnotationOrdering;
  page?: string;
  page_size?: string;
};

export type LexicalEntryFilters = {
  language?: string;
  part_of_speech?: string;
  gender?: string;
  lemma?: string;
  lemma__icontains?: string;
  /** Söker i grundformen, sparade former, synonymer, modern form, översättning, definition och konnotationer. */
  search?: string;
  owner?: string;
  /** Orden i en ordlista (ordlistans id). */
  glossaries?: string;
  /** Slår upp grundformen från en stavningsvariant eller böjd form. */
  forms__form__iexact?: string;
  /** "true": bara ord användaren får ändra (egna, och ägarlösa från innan ord hade ägare). */
  editable?: string;
  page?: string;
  /** Högst 200; 25 om inget anges. */
  page_size?: string;
};

export type LexicalFormFilters = Partial<FormGrammar> & {
  entry?: string;
  form?: string;
  form__iexact?: string;
  form__icontains?: string;
  kind?: string;
  is_uncertain?: string;
  unit?: string;
};

export type GlossaryFilters = {
  owner?: string;
  is_private?: string;
  title?: string;
  title__icontains?: string;
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
