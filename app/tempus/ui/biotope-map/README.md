# Biotope map

A self-contained React/SVG map module. Its internal imports are relative, so the entire
`biotope-map` folder can be copied into another React or Next.js project.

## Move to Origo

Copy this folder to:

```text
app/components/biotope-map/
```

Then import only from the folder entry point:

```tsx
import { BiotopeMap } from "@/app/components/biotope-map";

export function Example() {
  return (
    <BiotopeMap
      biotope="rivers"
      seed="ORIGO-42"
      features={{ trees: true, roads: true }}
      title="Illustrated habitat map"
      className="w-full"
    />
  );
}
```

`BiotopeMap` and `MapCanvas` do not use client-only React hooks and can render in a
Next.js Server Component. The SVG download helpers access browser APIs and should only
be called from a client-side event handler.

## Public API

- `BiotopeMap`: high-level component that creates and renders a deterministic map.
- `MapCanvas`: low-level renderer for an already generated scene.
- `SwedenMap`: read-only Sweden outline with the four largest lakes and GeoJSON overlays.
- `generateMap`: pure scene generator.
- `sceneToSvg` and `layerToSvg`: serialize generated scenes.
- `downloadSvg` and `downloadLayerSvg`: browser download helpers.
- Map option, feature, layer, element, and scene types.

Files named `contour.ts`, `noise.ts`, `generate.ts`, and `types.ts` are internal
implementation files. Keep them in the folder when copying the module.

## Theme inheritance

The SVG first reads dedicated `--biotope-map-*` variables, then Origo tenant tokens
such as `--surface`, `--accent`, `--text`, and `--text-muted`. Generic `--color-*`
tokens and standalone colors remain as portability fallbacks.
Light/dark mode therefore follows the surrounding Origo palette without regenerating
the scene.

Override only the roles that need a special treatment:

```tsx
<BiotopeMap
  className="text-text"
  theme={{
    paper: "var(--surface)",
    contourMajor: "var(--accent)",
    ink: "var(--text)",
  }}
/>
```

Available roles are `paper`, `paperWarm`, `sea`, `seaDeep`, `water`, `waterLine`,
`contourMinor`, `contourMajor`, `ink`, `inkSoft`, `field`, `forest`, `areaFill`, and
`areaStroke`.

## Sweden map

`SwedenMap` bundles a presentation-scale outline of Sweden and Vänern, Vättern,
Mälaren, and Hjälmaren. Pass read-only WGS84 (`EPSG:4326`) GeoJSON polygons or
multipolygons through `areas`:

```tsx
import { SwedenMap, type SwedenMapFeatureCollection } from "@/app/components/biotope-map";

const areas: SwedenMapFeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      id: "example-area",
      properties: { name: "Example" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [16.0, 59.0],
            [17.0, 59.0],
            [17.0, 60.0],
            [16.0, 60.0],
            [16.0, 59.0],
          ],
        ],
      },
    },
  ],
};

export function ExampleSwedenMap() {
  return <SwedenMap areas={areas} title="Marked areas in Sweden" />;
}
```

The bundled geometry is simplified Natural Earth 1:10m public-domain data. It is
intended for overview graphics, not measurement or boundary analysis.
