"use client"

import { IndexTabs } from "./index-tabs"
import { useOverview } from "./overview-provider"

// The page's selection: the species the visitor follows, or the whole selection.
export function ViewTabs() {
  const { view } = useOverview().selection
  return (
    <IndexTabs
      label="Urval"
      tabs={[
        { key: "followed", label: "Följda arter", active: view === "followed", change: { view: "followed" } },
        { key: "all", label: "Hela urvalet", active: view === "all", change: { view: "all" } },
      ]}
    />
  )
}
