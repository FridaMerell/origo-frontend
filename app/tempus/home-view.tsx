"use client"

import { Fragment, type ReactNode } from "react"
import { useTempusPreviewedPosition } from "./_state/tempus-context"
import { InterestingSpots } from "./home/interesting-spots"
import { useHomeData } from "./home/overview-data"
import { useOverview } from "./home/overview-provider"
import { fieldNote, registerNote, summaryNote, windowsNote } from "./home/rail-notes"
import { RegisterSection } from "./home/register-section"
import { SeasonOverviewHeader } from "./home/season-overview-header"
import { SeasonWindows } from "./home/season-windows"
import { RailMark, SECTION_RULE, type RailNote } from "./home/sheet-rail"
import { LABEL } from "./home/styles"

type SheetSection = { key: string; note: RailNote; content: ReactNode }

// The start page as a sheet: a title strip under the menu, then its sections,
// each with a note in the margin.
//
// How it hangs together:
// - `useHomeData` builds everything that is shown, for whichever selection is
//   chosen. It is called here, once, and handed down as props.
// - The visitor's choices (selection, reading, pages) live in the URL and are
//   read and changed through `useOverview`.
// - The sheet's numbered sections are the season's own: the state of it, what
//   is about to change, and the species. To add one, add an entry to `sections`.
export default function HomeView({
  areaName,
  position,
  todayLabel,
  week,
  currentMonth,
  route,
  nextRoute,
}: {
  areaName: string
  // The area's centre as coordinates, when it has a shape.
  position: string | null
  todayLabel: string
  // Today's ISO week number.
  week: number
  currentMonth: number
  // The next planned route, rendered on the server, and what the margin says of it.
  route: ReactNode
  nextRoute: { name: string; date: string } | null
}) {
  const { isGuest, selection } = useOverview()
  const data = useHomeData()
  const previewedPosition = useTempusPreviewedPosition()

  const sections: SheetSection[] = [
    {
      key: "summary",
      note: summaryNote(data, week),
      content: <SeasonOverviewHeader areaName={areaName} intro={data.intro} map={data.map} tally={data.tally} />,
    },
    {
      key: "windows",
      note: windowsNote(data),
      content: <SeasonWindows windows={data.windows} view={data.view} />,
    },
    {
      key: "register",
      note: registerNote(data, selection),
      content: <RegisterSection data={data} areaName={areaName} currentMonth={currentMonth} />,
    },
    // Places near the visitor and the next planned route share one section,
    // one under the other: they are not related, so they are not set side by
    // side. Visitors without a session have neither.
    ...(isGuest
      ? []
      : [
          {
            key: "field",
            note: fieldNote(nextRoute),
            content: (
              <section>
                <InterestingSpots allowLocation onSheet />
                <div className="mt-8 border-t border-border pt-8">{route}</div>
              </section>
            ),
          },
        ]),
  ]

  return (
    <div className="container text-text">
      <div className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-text py-3.5 text-text-muted ${LABEL}`}>
        <span>
          <span className="text-text">{areaName}</span>
          <span aria-hidden="true" className="mx-2.5">·</span>
          {todayLabel}
        </span>
        <span>
          {/* While the pointer rests on an area in the area list, its coordinates stand here instead. */}
          {previewedPosition ?? position ? (
            <>
              <span className={`tabular-nums transition-colors duration-200 ${previewedPosition ? "text-text" : ""}`}>
                {previewedPosition ?? position}
              </span>
              <span aria-hidden="true" className="mx-2.5">·</span>
            </>
          ) : null}
          vecka {week}
        </span>
      </div>

      {/* The margin's width and the gap beside it are fixed, so the content's
          edges do not move. Sections are parted by one rule across the whole
          sheet, with the same room (40px) above it as below. */}
      <div className="grid sm:grid-cols-[6.5rem_minmax(0,1fr)]">
        {sections.map((section, index) => (
          <Fragment key={section.key}>
            <RailMark number={index + 1} note={section.note} ruled={index > 0} />
            <div className={`min-w-0 ${index > 0 ? SECTION_RULE : ""}`}>
              <div className="py-10 sm:pl-8">{section.content}</div>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  )
}
