"use client";

import { useMemo, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import {
  SwedenMap,
  type GeoJsonPolygonGeometry,
  type GeoJsonPosition,
  type SwedenMapFeature,
  type SwedenMapFeatureCollection,
  type SwedenMapProps,
} from "./SwedenMap";
import {
  areaFeatures,
  createProjection,
  openRing,
  polygonFromPoints,
} from "./sweden-map-area-geometry";
import { useAreaEditorInteraction, type EditorTool } from "./use-area-editor-interaction";

export type SwedenMapAreaEditorProps = Omit<
  SwedenMapProps,
  "areas" | "className" | "onChange"
> & {
  areas?: SwedenMapFeatureCollection | readonly SwedenMapFeature[];
  className?: string;
  defaultValue?: GeoJsonPolygonGeometry | null;
  disabled?: boolean;
  name?: string;
  onChange?: (geometry: GeoJsonPolygonGeometry | null) => void;
};

/**
 * Interactive wrapper for drawing one GeoJSON polygon over the read-only
 * SwedenMap. The base map remains usable without shipping editor behavior.
 */
export function SwedenMapAreaEditor({
  areas,
  className,
  defaultValue,
  disabled = false,
  name,
  onChange,
  width = 600,
  height = 900,
  padding = 30,
  ...mapProps
}: SwedenMapAreaEditorProps) {
  const [points, setPoints] = useState<GeoJsonPosition[]>(() => openRing(defaultValue));
  const [tool, setTool] = useState<EditorTool>("polygon");
  const projection = useMemo(() => createProjection(width, height, padding), [width, height, padding]);
  const geometry = polygonFromPoints(points);
  const visibleAreas = useMemo<readonly SwedenMapFeature[]>(
    () => [
      ...areaFeatures(areas),
      ...(geometry
        ? [{ type: "Feature" as const, id: "geo-area-draft", properties: null, geometry }]
        : []),
    ],
    [areas, geometry],
  );
  const mapPoints = points.map((point) => projection.toMap(point));

  const updatePoints = (nextPoints: GeoJsonPosition[]) => {
    setPoints(nextPoints);
    onChange?.(polygonFromPoints(nextPoints));
  };

  const { startInteraction, continueInteraction, endInteraction } = useAreaEditorInteraction({
    tool,
    disabled,
    points,
    geometry,
    mapPoints,
    projection,
    updatePoints,
  });

  return (
    <div className={["flex flex-col gap-3", className].filter(Boolean).join(" ")}>
      <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Ritverktyg">
        <Button
          type="button"
          size="sm"
          variant={tool === "polygon" ? "primary" : "secondary"}
          disabled={disabled}
          aria-pressed={tool === "polygon"}
          onClick={() => setTool("polygon")}
        >
          Punkter
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tool === "square" ? "primary" : "secondary"}
          disabled={disabled}
          aria-pressed={tool === "square"}
          onClick={() => setTool("square")}
        >
          Ruta
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tool === "move" ? "primary" : "secondary"}
          disabled={disabled || !geometry}
          aria-pressed={tool === "move"}
          onClick={() => setTool("move")}
        >
          Flytta
        </Button>
      </div>

      <div className="relative overflow-hidden rounded border border-border">
        <SwedenMap
          {...mapProps}
          areas={visibleAreas}
          width={width}
          height={height}
          padding={padding}
          className="block h-auto w-full"
        />

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className={[
            "absolute inset-0 h-full w-full touch-none",
            disabled ? "cursor-default" : tool === "move" ? "cursor-move" : "cursor-crosshair",
          ].join(" ")}
          role="application"
          aria-label="Rita ett geografiskt område genom att klicka ut minst tre punkter"
          onPointerDown={startInteraction}
          onPointerMove={continueInteraction}
          onPointerUp={endInteraction}
          onPointerCancel={(event) => endInteraction(event, true)}
        >
          {mapPoints.length > 1 ? (
            <polyline
              points={mapPoints.map(([x, y]) => `${x},${y}`).join(" ")}
              fill="none"
              stroke="var(--biotope-map-area-stroke, var(--accent-hover, var(--color-accent, #8f4932)))"
              strokeWidth={2}
              strokeDasharray={geometry ? undefined : "5 5"}
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          ) : null}
          {mapPoints.map(([x, y], index) => (
            <circle
              key={`${x}-${y}-${index}`}
              cx={x}
              cy={y}
              r={3.5}
              fill="var(--biotope-map-area-stroke, var(--accent-hover, var(--color-accent, #8f4932)))"
              stroke="var(--surface, white)"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          ))}
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled || points.length === 0}
          onClick={() => updatePoints(points.slice(0, -1))}
        >
          Ångra punkt
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled || points.length === 0}
          onClick={() => updatePoints([])}
        >
          Rensa
        </Button>
        <span className="font-mono text-xs text-text-muted" aria-live="polite">
          {geometry ? `${points.length} punkter · området är klart att spara` : `${points.length}/3 punkter`}
        </span>
      </div>

      <p className="text-xs text-text-muted">
        {tool === "polygon"
          ? "Klicka ut hörn ett i taget."
          : tool === "square"
            ? "Dra över kartan för att skapa en kvadratisk ruta."
            : "Dra inuti området för att flytta det."}
      </p>

      {name ? <input type="hidden" name={name} value={geometry ? JSON.stringify(geometry) : ""} /> : null}
    </div>
  );
}
