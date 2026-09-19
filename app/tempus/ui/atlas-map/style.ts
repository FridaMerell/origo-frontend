import type { StyleSpecification } from "maplibre-gl"

// The established convention across this map for a layer that must stay
// hit-testable (queryRenderedFeatures) but never be seen: a hair above zero
// rather than exactly 0.
export const INVISIBLE_HIT_TESTABLE_OPACITY = 0.001

// No external basemap. The locale atlas is a jordebok-style rendering of the
// locale's own Lantmäteriet land-cover data (added at runtime as the
// "origo-land-cover" source in LocaleAtlasMap) — not a map you pan around
// on. There is nothing to show outside that data, so there is nothing here
// but a paper-coloured background.
export const atlasStyle: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#fbf8f0" } },
  ],
}
