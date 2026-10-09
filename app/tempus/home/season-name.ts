// The time of year in plain words, by ISO week. The boundaries follow the
// calendar for southern and central Sweden; they are a name for the date, not a
// measurement of the season.
const SEASONS: [fromWeek: number, name: string][] = [
  [1, "Vinter"],
  [9, "Vårvinter"],
  [13, "Tidig vår"],
  [17, "Vår"],
  [21, "Försommar"],
  [26, "Högsommar"],
  [32, "Sensommar"],
  [36, "Tidig höst"],
  [40, "Höst"],
  [44, "Sen höst"],
  [49, "Vinter"],
]

export function seasonName(week: number): string {
  let name = SEASONS[0][1]
  for (const [fromWeek, season] of SEASONS) {
    if (week >= fromWeek) name = season
  }
  return name
}
