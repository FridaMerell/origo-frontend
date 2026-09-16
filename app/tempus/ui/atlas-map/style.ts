import type { StyleSpecification } from "maplibre-gl"

// The established convention across this map for a layer that must stay
// hit-testable (queryRenderedFeatures) but never be seen: a hair above zero
// rather than exactly 0. Used for query-only helper layers (buildings-fill),
// layers superseded by a different visual source but kept for their
// ATLAS_INTERACTIVE_LAYERS fallback (landuse-farmland and friends below),
// and layers whose own text/fill is replaced by a plain-HTML overlay
// elsewhere (atlas-places, drawn by <PlaceLabels> instead).
export const INVISIBLE_HIT_TESTABLE_OPACITY = 0.001

export const ATLAS_INTERACTIVE_LAYERS = ["landcover-wood", "landuse-farmland", "landcover-grass", "landcover-wetland"] as const
export const ROAD_LAYERS = ["road-major-casing", "road-major", "road-secondary-casing", "road-secondary", "road-minor", "road-track", "road-path"] as const
export const HOUSE_LAYERS = ["buildings-fill", "buildings-outline"] as const

export const atlasStyle: StyleSpecification = {
  version: 8,
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  sources: {
    openmaptiles: { type: "vector", url: "https://tiles.openfreemap.org/planet", attribution: "© OpenFreeMap · © OpenStreetMap" },
  },
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#fbf8f0" } },
    // Kept invisible (not removed): its shape still backs the interactive
    // area-click layer and hit-testing on hidden fills still works. The
    // visible beige fill for farmland now comes from the locale's own
    // Lantmäteriet polygon (origo-texture-agriculture in LocaleAtlasMap) —
    // OSM's landuse boundary rarely matches Lantmäteriet's exactly, and
    // showing both at once created a visible seam where the two disagreed.
    { id: "landuse-farmland", type: "fill", source: "openmaptiles", "source-layer": "landuse", minzoom: 6, filter: ["in", ["get", "class"], ["literal", ["farmland", "orchard", "vineyard", "farmyard"]]], paint: { "fill-color": ["interpolate", ["linear"], ["zoom"], 11, "#eee8c8", 14, "#f2ead0"] } },
    { id: "landuse-farmland-pattern", type: "fill", source: "openmaptiles", "source-layer": "landuse", minzoom: 13, filter: ["in", ["get", "class"], ["literal", ["farmland", "orchard", "vineyard", "farmyard"]]], paint: { "fill-opacity": 0 } },
    // Hidden alongside landuse-farmland above, same reason: this dashed
    // outline traces OSM's farmland shape, which would still visibly disagree
    // with Lantmäteriet's polygon even with the fill gone.
    { id: "landuse-boundary", type: "line", source: "openmaptiles", "source-layer": "landuse", minzoom: 11, filter: ["in", ["get", "class"], ["literal", ["farmland", "orchard", "vineyard", "farmyard"]]], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#777052", "line-width": .62, "line-opacity": 0, "line-dasharray": [3.2, 2.3] } },
    // These OSM landcover fills are the fallback base layer wherever origo's
    // Lantmäteriet-backed land-cover has no data — outside the current
    // locale's own boundary, origo never fetches anything there (deliberately,
    // to avoid unbounded-area Lantmäteriet requests), so without this OSM
    // layer that surrounding area rendered blank. Inside the locale, origo's
    // fill + canvas texture is always added later (on top) and fully covers
    // these, so there's no visible clash between the two classifications —
    // they only actually show through in different places.
    { id: "landcover-grass", type: "fill", source: "openmaptiles", "source-layer": "landcover", minzoom: 5, filter: ["==", ["get", "class"], "grass"], paint: { "fill-color": "#e7ebd3" } },
    { id: "landcover-wood", type: "fill", source: "openmaptiles", "source-layer": "landcover", minzoom: 4, filter: ["==", ["get", "class"], "wood"], paint: { "fill-color": ["interpolate", ["linear"], ["zoom"], 6, "#d5d9bd", 12, "#e0e3c9", 16, "#e8e8d5"] } },
    { id: "landcover-wood-boundary", type: "line", source: "openmaptiles", "source-layer": "landcover", minzoom: 9, filter: ["==", ["get", "class"], "wood"], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#777352", "line-width": .65, "line-opacity": 0, "line-dasharray": [2, 2.4] } },
    { id: "landcover-wetland", type: "fill", source: "openmaptiles", "source-layer": "landcover", minzoom: 5, filter: ["==", ["get", "class"], "wetland"], paint: { "fill-color": "#d7dfcb" } },
    { id: "landcover-wetland-pattern", type: "fill", source: "openmaptiles", "source-layer": "landcover", minzoom: 7, filter: ["==", ["get", "class"], "wetland"], paint: { "fill-opacity": 0 } },
    { id: "landcover-boundary", type: "line", source: "openmaptiles", "source-layer": "landcover", minzoom: 13, paint: { "line-opacity": 0 } },
    { id: "water", type: "fill", source: "openmaptiles", "source-layer": "water", paint: { "fill-color": "#d7e3e4" } },
    { id: "water-hatching", type: "fill", source: "openmaptiles", "source-layer": "water", minzoom: 9, paint: { "fill-pattern": "water-hatch", "fill-opacity": .62 } },
    { id: "waterway", type: "line", source: "openmaptiles", "source-layer": "waterway", minzoom: 8, paint: { "line-color": "#8fa9b2", "line-width": ["interpolate", ["linear"], ["zoom"], 8, .6, 14, 3] } },
    { id: "road-major-casing", type: "line", source: "openmaptiles", "source-layer": "transportation", minzoom: 6, filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary"]]], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#69523b", "line-opacity": .7, "line-width": ["interpolate", ["linear"], ["zoom"], 6, 1.4, 12, 3.4] } },
    { id: "road-major", type: "line", source: "openmaptiles", "source-layer": "transportation", minzoom: 6, filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary"]]], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#f5f0df", "line-opacity": .94, "line-width": ["interpolate", ["linear"], ["zoom"], 6, .65, 12, 2.15] } },
    { id: "road-secondary-casing", type: "line", source: "openmaptiles", "source-layer": "transportation", minzoom: 9, filter: ["in", ["get", "class"], ["literal", ["secondary", "tertiary"]]], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#79634a", "line-opacity": .62, "line-width": ["interpolate", ["linear"], ["zoom"], 9, 1.05, 13, 2.35] } },
    { id: "road-secondary", type: "line", source: "openmaptiles", "source-layer": "transportation", minzoom: 9, filter: ["in", ["get", "class"], ["literal", ["secondary", "tertiary"]]], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#f6f1e1", "line-opacity": .9, "line-width": ["interpolate", ["linear"], ["zoom"], 9, .45, 13, 1.25] } },
    { id: "road-minor", type: "line", source: "openmaptiles", "source-layer": "transportation", minzoom: 12, filter: ["in", ["get", "class"], ["literal", ["minor", "service"]]], paint: { "line-color": "#8a704e", "line-opacity": .62, "line-width": ["interpolate", ["linear"], ["zoom"], 12, .5, 14, 1.2] } },
    { id: "road-track", type: "line", source: "openmaptiles", "source-layer": "transportation", minzoom: 13, filter: ["==", ["get", "class"], "track"], paint: { "line-color": "#8a6f4d", "line-width": 1, "line-dasharray": [3, 2.5] } },
    { id: "road-path", type: "line", source: "openmaptiles", "source-layer": "transportation", minzoom: 14, filter: ["==", ["get", "class"], "path"], paint: { "line-color": "#8a6f4d", "line-width": .7, "line-dasharray": [1.5, 2] } },
    // Deliberately its own colour, not sourced from LAND_COVER_KINDS.building
    // — that registry entry is the ground wash for a whole bebyggelse-
    // classified parcel, while this is the solid colour of an individual
    // house body. Same underlying "building" kind, two different visual
    // roles at two very different scales.
    { id: "buildings-fill", type: "fill", source: "openmaptiles", "source-layer": "building", minzoom: 13, paint: { "fill-color": "#a8613a", "fill-opacity": .9 } },
    { id: "buildings-outline", type: "line", source: "openmaptiles", "source-layer": "building", minzoom: 13, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#663829", "line-width": .65, "line-opacity": .86 } },
    { id: "atlas-places", type: "symbol", source: "openmaptiles", "source-layer": "place", minzoom: 5, layout: { "text-field": ["coalesce", ["get", "name:sv"], ["get", "name"]], "text-font": ["Noto Sans Regular"], "text-size": ["interpolate", ["linear"], ["zoom"], 5, 11, 12, 15], "text-max-width": 9 }, paint: { "text-color": "#5b4632", "text-halo-color": "#fbf8f0", "text-halo-width": 1 } },
  ],
}
