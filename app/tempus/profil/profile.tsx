import Link from "next/link"
import type { ReactNode } from "react"
import type { TempusProfile, TempusProfileSpecies } from "@/app/lib/dal/tempus/observations"

const MONTHS = ["januari", "februari", "mars", "april", "maj", "juni", "juli", "augusti", "september", "oktober", "november", "december"]
const RED_LIST: Record<string, string> = {
  NT: "Nära hotad",
  VU: "Sårbar",
  EN: "Starkt hotad",
  CR: "Akut hotad",
  RE: "Nationellt utdöd",
  DD: "Kunskapsbrist",
}

const HEADING = "font-display text-xl font-semibold tracking-tight sm:text-2xl"
const STATEMENT = "font-display text-base italic sm:text-lg"
const LINK = "text-current underline decoration-border underline-offset-4 hover:text-accent hover:decoration-accent"
const STEP = "font-display italic text-accent no-underline hover:text-accent-hover"

const formatCount = (value: number) => value.toLocaleString("sv-SE")
const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Stockholm" })
const plural = (count: number, one: string, many: string) => `${formatCount(count)} ${count === 1 ? one : many}`
const speciesName = (species: { swedish_name: string; scientific_name: string }) =>
  species.swedish_name || species.scientific_name
const speciesHref = (dyntaxaTaxonId: number) => `/taxa/oversikt/${dyntaxaTaxonId}`

// "58°40′ N 16°18′ Ö", as on a map's margin.
function formatPosition([lon, lat]: [number, number]) {
  const part = (value: number) => {
    const degrees = Math.floor(Math.abs(value))
    const minutes = Math.round((Math.abs(value) - degrees) * 60)
    return minutes === 60 ? `${degrees + 1}°00′` : `${degrees}°${String(minutes).padStart(2, "0")}′`
  }
  return `${part(lat)} ${lat >= 0 ? "N" : "S"} ${part(lon)} ${lon >= 0 ? "Ö" : "V"}`
}

function SpeciesLink({ species }: { species: TempusProfileSpecies }) {
  return (
    <Link href={speciesHref(species.dyntaxa_taxon_id)} className={LINK}>
      {speciesName(species)}
    </Link>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-12 sm:mt-14">
      <h2 className={HEADING}>{title}</h2>
      <div className="mt-3 sm:mt-4">{children}</div>
    </section>
  )
}

export function Profile({ profile }: { profile: TempusProfile }) {
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.username
  const first = profile.first_observation
  const figures: [number, string, string][] = [
    [profile.observation_count, "observation", "observationer"],
    [profile.species_count, "art", "arter"],
    [profile.locale_count, "lokal", "lokaler"],
    [profile.years.length, "år", "år"],
    [profile.photo_count, "foto", "foton"],
    [profile.red_listed_count ?? 0, "rödlistad art", "rödlistade arter"],
  ]

  return (
    <div className="container mx-auto pt-8 pb-20 max-sm:px-4 sm:pt-12">
      <header>
        <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{name}</h1>
        <p className={`mt-2 ${STATEMENT} text-text-muted`}>Medlem sedan {formatDate(profile.date_joined)}.</p>
        {first ? (
          <p className={`mt-1 ${STATEMENT}`}>
            Första observationen:{" "}
            <Link href={speciesHref(first.dyntaxa_taxon_id)} className={LINK}>{speciesName(first)}</Link>,{" "}
            <Link href={`/observationer/${first.id}`} className={LINK}>
              {formatDate(first.observed_at)}
              {first.locale_name ? ` vid ${first.locale_name}` : ""}
            </Link>
            .
          </p>
        ) : null}
      </header>

      <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-5 sm:mt-10 sm:gap-x-10">
        {figures.map(([count, one, many]) => (
          <div key={many} className="flex flex-col-reverse">
            <dt className="mt-1 text-xs text-text-muted sm:text-sm">{count === 1 ? one : many}</dt>
            <dd className="font-display text-3xl font-semibold leading-none tabular-nums sm:text-4xl">
              {formatCount(count)}
            </dd>
          </div>
        ))}
      </dl>

      {profile.observation_count === 0 ? (
        <p className={`mt-12 ${STATEMENT}`}>
          Inga observationer än. <Link href="/observationer/ny" className={LINK}>Lägg till den första</Link>.
        </p>
      ) : (
        <>
          <SpeciesSection profile={profile} />
          <YearsSection profile={profile} />
          <MonthsSection months={profile.months ?? []} />
          <PlacesSection profile={profile} />
        </>
      )}

      <Section title="Följda arter">
        <p className={STATEMENT}>
          {profile.follows.follow_count ? (
            <>
              Du följer {plural(profile.follows.follow_count, "art", "arter")} och har observerat{" "}
              {formatCount(profile.follows.seen_count)} av dem.
            </>
          ) : (
            "Du följer inga arter."
          )}
        </p>
      </Section>

      <Section title="Planering">
        <div className={`flex flex-col gap-1 ${STATEMENT}`}>
          <p>
            <Link href="/checklistor" className={LINK}>{plural(profile.planning.checklist_count, "checklista", "checklistor")}</Link>
            {profile.planning.item_count ? (
              <>
                , där {formatCount(profile.planning.observed_item_count)} av{" "}
                {plural(profile.planning.item_count, "art", "arter")} har en observation
              </>
            ) : null}
            .
          </p>
          <p>
            <Link href="/rutt" className={LINK}>{plural(profile.planning.route_count, "planerad rutt", "planerade rutter")}</Link>.
          </p>
        </div>
      </Section>

      {profile.birdnet ? (
        <Section title="BirdNET">
          <p className={STATEMENT}>
            <Link href="/birdnet" className={LINK}>{plural(profile.birdnet.detection_count, "detektion", "detektioner")}</Link>{" "}
            av {plural(profile.birdnet.species_count, "art", "arter")}.
          </p>
        </Section>
      ) : null}
    </div>
  )
}

function SpeciesSection({ profile }: { profile: TempusProfile }) {
  const groups = profile.groups ?? []
  const largest = Math.max(1, ...groups.map((group) => group.species_count))
  const { most_observed: most, newest, rarest } = profile

  return (
    <Section title="Arter">
      <div className={`flex flex-col gap-1 ${STATEMENT}`}>
        {most ? (
          <p>
            Mest observerad: <SpeciesLink species={most} />, {plural(most.observation_count, "gång", "gånger")}.
          </p>
        ) : null}
        {newest ? (
          <p>
            Senast nya art: <SpeciesLink species={newest} />, {formatDate(newest.first_observed_at)}.
          </p>
        ) : null}
        {rarest ? (
          <p>
            Ovanligast: <SpeciesLink species={rarest} />
            {RED_LIST[rarest.red_list_category] ? `, ${RED_LIST[rarest.red_list_category].toLowerCase()}` : ""}.
          </p>
        ) : null}
      </div>

      {groups.length ? (
        <div className="mt-6 grid max-w-2xl grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-1.5">
          {groups.map((group) => (
            <div key={group.id} className="contents">
              <span className="text-sm sm:text-base">
                {group.taxon_id ? (
                  <Link href={`/taxa/${group.taxon_id}`} className={LINK}>{group.label}</Link>
                ) : (
                  group.label
                )}
              </span>
              <span className="h-2.5">
                <span className="block h-full bg-secondary" style={{ width: `${(group.species_count / largest) * 100}%` }} />
              </span>
              <span className="text-right text-sm tabular-nums text-text-muted sm:text-base">{formatCount(group.species_count)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </Section>
  )
}

function YearsSection({ profile }: { profile: TempusProfile }) {
  return (
    <Section title="År för år">
      <ul className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1">
        {profile.years.map((row) => (
          <li key={row.year} className="contents">
            <Link href={`/ar/${row.year}`} className={`${STEP} text-lg tabular-nums sm:text-xl`}>
              {row.year}
            </Link>
            <span className="text-sm text-text-muted tabular-nums sm:text-base">
              {plural(row.observation_count, "observation", "observationer")} · {plural(row.species_count, "art", "arter")} ·{" "}
              {formatCount(row.new_species_count)} {row.new_species_count === 1 ? "ny" : "nya"}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  )
}

function MonthsSection({ months }: { months: number[] }) {
  const most = Math.max(0, ...months)
  if (!most) return null
  const busiest = months.indexOf(most)

  return (
    <Section title="Säsong">
      <p className={STATEMENT}>
        Flest observationer i {MONTHS[busiest]}: <span className="tabular-nums">{formatCount(most)}</span>, alla år tillsammans.
      </p>
      <div className="mt-5 grid h-32 max-w-2xl grid-cols-12 items-end gap-1 sm:h-40 sm:gap-2">
        {months.map((count, index) => (
          <div
            key={MONTHS[index]}
            title={`${MONTHS[index]}: ${formatCount(count)}`}
            className={`${index === busiest ? "bg-text" : "bg-secondary"} ${count ? "" : "h-px"}`}
            style={count ? { height: `${(count / most) * 100}%` } : undefined}
          />
        ))}
      </div>
      <div className="mt-1.5 grid max-w-2xl grid-cols-12 gap-1 text-center text-xs text-text-muted sm:gap-2">
        {MONTHS.map((month) => (
          <span key={month}>{month.slice(0, 3)}</span>
        ))}
      </div>
    </Section>
  )
}

function PlacesSection({ profile }: { profile: TempusProfile }) {
  const locales = profile.top_locales ?? []
  const extremes = profile.extremes

  return (
    <Section title="Platser">
      {locales.length ? (
        <ol className="flex flex-col gap-1">
          {locales.map((locale) => (
            <li key={locale.id} className="flex items-baseline gap-3 text-base sm:text-lg">
              <Link href={`/lokaler/${locale.id}`} className={`font-display ${LINK}`}>{locale.name}</Link>
              <span className="text-sm text-text-muted tabular-nums">{plural(locale.observation_count, "observation", "observationer")}</span>
            </li>
          ))}
        </ol>
      ) : null}
      <div className={`mt-4 flex flex-col gap-1 ${STATEMENT}`}>
        <p>
          <Link href="/lokaler" className={LINK}>{plural(profile.own_locale_count, "egen lokal", "egna lokaler")}</Link>.
        </p>
        {extremes ? (
          <p>
            Sydligast {extremes.south.locale_name ? `vid ${extremes.south.locale_name}` : formatPosition(extremes.south.coordinates)},
            nordligast {extremes.north.locale_name ? `vid ${extremes.north.locale_name}` : formatPosition(extremes.north.coordinates)},{" "}
            {formatCount(extremes.distance_km)} km emellan.
          </p>
        ) : null}
      </div>
    </Section>
  )
}
