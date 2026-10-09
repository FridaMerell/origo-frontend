"use client"

import { LandscapeRows } from "./landscape-rows"
import { LandscapeSelect } from "./landscape-select"
import type { HomeData } from "./overview-data"
import { ReadingButtons } from "./overview-modes"
import { useOverview } from "./overview-provider"
import { formatCount } from "./season-helpers"
import { SpeciesRegister } from "./species-register"
import { LABEL } from "./styles"

// The species themselves, in the reading chosen with the buttons over them: the followed
// ones as a table, the whole selection as that table or per landscape type.
export function RegisterSection({
  data,
  areaName,
  currentMonth,
}: {
  data: Pick<HomeData, "view" | "register" | "landscapes">
  areaName: string
  currentMonth: number
}) {
  const { mode, landscapeType } = useOverview().selection
  const { view, register, landscapes } = data
  const perLandscape = view === "all" && mode === "landscape"

  return (
    <section>
      {/* On the right of the buttons: the landscape choice, or how many
          species the table holds and the landscape type it is narrowed to. */}
      <ReadingButtons>
        {perLandscape ? (
          <LandscapeSelect options={landscapes.all.map((landscape) => landscape.name)} />
        ) : (
          <span className={`text-text-muted ${LABEL}`}>
            {landscapeType ? `${landscapeType} · ` : ""}
            {formatCount(register.count)} {register.count === 1 ? "art" : "arter"}
          </span>
        )}
      </ReadingButtons>

      {perLandscape ? (
        <LandscapeRows landscapes={landscapes} areaName={areaName} />
      ) : (
        <SpeciesRegister list={register} view={view} currentMonth={currentMonth} />
      )}
    </section>
  )
}
