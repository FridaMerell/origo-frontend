"use client";

import { useMemo, useRef, useState, type PointerEvent } from "react";
import { Button } from "@/app/components/ui/Button";
import { SWEDEN_LAND } from "./sweden-data";
import {
  SwedenMap,
  type GeoJsonPolygonGeometry,
  type GeoJsonPosition,
  type SwedenMapFeature,
  type SwedenMapFeatureCollection,
  type SwedenMapProps,
} from "./SwedenMap";

const REFERENCE_LATITUDE = 62.2;
const LONGITUDE_SCALE = Math.cos((REFERENCE_LATITUDE * Math.PI) / 180);

type ProjectedBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

type EditorTool = "polygon" | "square" | "move";

type DragInteraction =
  | {
      kind: "square";
      pointerId: number;
      start: readonly [number, number];
      hasArea: boolean;
      originalPoints: GeoJsonPosition[];
    }
  | {
      kind: "move";
      pointerId: number;
      start: readonly [number, number];
      originalMapPoints: readonly (readonly [number, number])[];
      originalPoints: GeoJsonPosition[];
    };

function projected(position: readonly number[]): readonly [number, number] {
  return [position[0]! * LONGITUDE_SCALE, -position[1]!];
}

function landBounds(): ProjectedBounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const polygon of SWEDEN_LAND) {
    for (const ring of polygon) {
      for (const position of ring) {
        const [x, y] = projected(position);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  return { minX, minY, maxX, maxY };
}

const BOUNDS = landBounds();

function createProjection(width: number, height: number, padding: number) {
  const availableWidth = Math.max(1, width - padding * 2);
  const availableHeight = Math.max(1, height - padding * 2);
  const dataWidth = BOUNDS.maxX - BOUNDS.minX;
  const dataHeight = BOUNDS.maxY - BOUNDS.minY;
  const scale = Math.min(availableWidth / dataWidth, availableHeight / dataHeight);
  const offsetX = padding + (availableWidth - dataWidth * scale) / 2;
  const offsetY = padding + (availableHeight - dataHeight * scale) / 2;

  return {
    toMap(position: readonly number[]): readonly [number, number] {
      const [x, y] = projected(position);
      return [offsetX + (x - BOUNDS.minX) * scale, offsetY + (y - BOUNDS.minY) * scale];
    },
    toGeoJson(x: number, y: number): GeoJsonPosition {
      const projectedX = BOUNDS.minX + (x - offsetX) / scale;
      const projectedY = BOUNDS.minY + (y - offsetY) / scale;
      return [projectedX / LONGITUDE_SCALE, -projectedY];
    },
  };
}

function openRing(geometry?: GeoJsonPolygonGeometry | null): GeoJsonPosition[] {
  const ring = geometry?.coordinates[0];
  if (!ring?.length) return [];

  const points = [...ring];
  const first = points[0];
  const last = points.at(-1);
  if (first && last && first[0] === last[0] && first[1] === last[1]) points.pop();
  return points.map((point) => [...point] as GeoJsonPosition);
}

function polygonFromPoints(points: readonly GeoJsonPosition[]): GeoJsonPolygonGeometry | null {
  if (points.length < 3) return null;

  const doubleArea = points.reduce((area, point, index) => {
    const next = points[(index + 1) % points.length]!;
    return area + point[0] * next[1] - next[0] * point[1];
  }, 0);
  if (Math.abs(doubleArea) < 1e-10) return null;

  return {
    type: "Polygon",
    coordinates: [[...points, points[0]!]],
  };
}

function pointInPolygon(
  point: readonly [number, number],
  polygon: readonly (readonly [number, number])[],
): boolean {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const [x, y] = polygon[index]!;
    const [previousX, previousY] = polygon[previous]!;
    const crosses =
      y > point[1] !== previousY > point[1] &&
      point[0] < ((previousX - x) * (point[1] - y)) / (previousY - y) + x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function areaFeatures(
  areas: SwedenMapFeatureCollection | readonly SwedenMapFeature[] | undefined,
): readonly SwedenMapFeature[] {
  if (!areas) return [];
  if (Array.isArray(areas)) return areas;
  return (areas as SwedenMapFeatureCollection).features;
}

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
  const interaction = useRef<DragInteraction | null>(null);
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

  const pointerPosition = (event: PointerEvent<SVGSVGElement>): readonly [number, number] | null => {
    const svg = event.currentTarget;
    const screenMatrix = svg.getScreenCTM();
    if (!screenMatrix) return null;

    const cursor = svg.createSVGPoint();
    cursor.x = event.clientX;
    cursor.y = event.clientY;
    const local = cursor.matrixTransform(screenMatrix.inverse());
    return [local.x, local.y];
  };

  const startInteraction = (event: PointerEvent<SVGSVGElement>) => {
    if (disabled) return;
    const position = pointerPosition(event);
    if (!position) return;

    if (tool === "polygon") {
      updatePoints([...points, projection.toGeoJson(...position)]);
      return;
    }

    if (tool === "move" && (!geometry || !pointInPolygon(position, mapPoints))) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    interaction.current =
      tool === "square"
        ? {
            kind: "square",
            pointerId: event.pointerId,
            start: position,
            hasArea: false,
            originalPoints: points,
          }
        : {
            kind: "move",
            pointerId: event.pointerId,
            start: position,
            originalMapPoints: mapPoints,
            originalPoints: points,
          };
  };

  const continueInteraction = (event: PointerEvent<SVGSVGElement>) => {
    const active = interaction.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const position = pointerPosition(event);
    if (!position) return;

    const deltaX = position[0] - active.start[0];
    const deltaY = position[1] - active.start[1];

    if (active.kind === "move") {
      updatePoints(
        active.originalMapPoints.map(([x, y]) =>
          projection.toGeoJson(x + deltaX, y + deltaY),
        ),
      );
      return;
    }

    const size = Math.max(Math.abs(deltaX), Math.abs(deltaY));
    active.hasArea = size >= 2;
    const endX = active.start[0] + (deltaX < 0 ? -size : size);
    const endY = active.start[1] + (deltaY < 0 ? -size : size);
    updatePoints([
      projection.toGeoJson(active.start[0], active.start[1]),
      projection.toGeoJson(endX, active.start[1]),
      projection.toGeoJson(endX, endY),
      projection.toGeoJson(active.start[0], endY),
    ]);
  };

  const endInteraction = (event: PointerEvent<SVGSVGElement>, cancelled = false) => {
    const active = interaction.current;
    if (!active || active.pointerId !== event.pointerId) return;

    if (cancelled || (active.kind === "square" && !active.hasArea)) {
      updatePoints(active.originalPoints);
    }
    interaction.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

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
