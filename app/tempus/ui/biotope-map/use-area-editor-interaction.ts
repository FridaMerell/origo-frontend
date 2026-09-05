import { useRef, type PointerEvent } from "react";
import type { GeoJsonPolygonGeometry, GeoJsonPosition } from "./SwedenMap";
import { pointInPolygon, type createProjection } from "./sweden-map-area-geometry";

export type EditorTool = "polygon" | "square" | "move";

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

/** Pointer handlers for the polygon/square/move drawing tools over the area editor's SVG overlay. */
export function useAreaEditorInteraction({
  tool,
  disabled,
  points,
  geometry,
  mapPoints,
  projection,
  updatePoints,
}: {
  tool: EditorTool;
  disabled: boolean;
  points: GeoJsonPosition[];
  geometry: GeoJsonPolygonGeometry | null;
  mapPoints: readonly (readonly [number, number])[];
  projection: ReturnType<typeof createProjection>;
  updatePoints: (nextPoints: GeoJsonPosition[]) => void;
}) {
  const interaction = useRef<DragInteraction | null>(null);

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

  return { startInteraction, continueInteraction, endInteraction };
}
