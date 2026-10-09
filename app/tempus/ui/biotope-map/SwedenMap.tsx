"use client";

import { useId, useMemo, type ComponentPropsWithoutRef, type MouseEvent } from "react";
import { SWEDEN_LAKES, SWEDEN_LAND, type PolygonCoordinates } from "./sweden-data";
import { areaFeatures, createProjection } from "./sweden-map-area-geometry";
import { mapThemeStyle } from "./theme";
import { PALETTE, type MapTheme } from "./types";

export type GeoJsonPosition = readonly [longitude: number, latitude: number, ...rest: number[]];

export type GeoJsonPolygonGeometry = {
  type: "Polygon";
  coordinates: readonly (readonly GeoJsonPosition[])[];
};

export type GeoJsonMultiPolygonGeometry = {
  type: "MultiPolygon";
  coordinates: readonly (readonly (readonly GeoJsonPosition[])[])[];
};

export type SwedenMapGeometry = GeoJsonPolygonGeometry | GeoJsonMultiPolygonGeometry;

export type SwedenMapFeature = {
  type: "Feature";
  id?: string | number;
  properties?: Record<string, unknown> | null;
  geometry: SwedenMapGeometry | null;
};

export type SwedenMapFeatureCollection = {
  type: "FeatureCollection";
  features: readonly SwedenMapFeature[];
};

export type SwedenMapPoint = {
  id?: string | number;
  coordinates: GeoJsonPosition;
  label?: string;
};

export type SwedenMapOverlayLayer = {
  id: string;
  features: readonly SwedenMapFeature[];
  fill?: string;
  fillOpacity?: number;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
};

export type SwedenMapProps = Omit<
  ComponentPropsWithoutRef<"svg">,
  "children" | "width" | "height" | "points"
> & {
  areas?: SwedenMapFeatureCollection | readonly SwedenMapFeature[];
  overlays?: readonly SwedenMapOverlayLayer[];
  points?: readonly SwedenMapPoint[];
  width?: number;
  height?: number;
  padding?: number;
  areaFillOpacity?: number;
  areaStrokeWidth?: number;
  pointRadius?: number;
  onPointClick?: (point: SwedenMapPoint) => void;
  onMapClick?: (coordinates: GeoJsonPosition) => void;
  selectedPoint?: SwedenMapPoint | null;
  autoZoom?: boolean;
  showLakeLabels?: boolean;
  title?: string | undefined;
  theme?: Partial<MapTheme> | undefined;
};

type Project = (position: readonly number[]) => readonly [number, number];

function ringPath(ring: readonly (readonly number[])[], project: Project): string {
  return ring
    .map((position, index) => {
      const [x, y] = project(position);
      return `${index === 0 ? "M" : "L"}${round1(x)} ${round1(y)}`;
    })
    .join("") + "Z";
}

function polygonPath(polygon: readonly (readonly (readonly number[])[])[], project: Project): string {
  return polygon.map((ring) => ringPath(ring, project)).join("");
}

function geometryPath(geometry: SwedenMapGeometry, project: Project): string {
  if (geometry.type === "Polygon") return polygonPath(geometry.coordinates, project);
  return geometry.coordinates.map((polygon) => polygonPath(polygon, project)).join("");
}

function lakeLabelPosition(coordinates: PolygonCoordinates, project: Project) {
  const outer = coordinates[0] ?? [];
  if (!outer.length) return [0, 0] as const;
  const sum = outer.reduce(
    (result, position) => {
      const [x, y] = project(position);
      return [result[0] + x, result[1] + y] as const;
    },
    [0, 0] as const,
  );
  return [sum[0] / outer.length, sum[1] / outer.length] as const;
}

function geometryPositions(geometry: SwedenMapGeometry): readonly GeoJsonPosition[] {
  if (geometry.type === "Polygon") {
    return geometry.coordinates.flat();
  }
  return geometry.coordinates.flat(2);
}

type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

function contentBounds(
  features: readonly SwedenMapFeature[],
  points: readonly SwedenMapPoint[],
  project: Project,
): Bounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const consume = (position: readonly number[]) => {
    const [x, y] = project(position);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };

  for (const feature of features) {
    if (!feature.geometry) continue;
    for (const position of geometryPositions(feature.geometry)) consume(position);
  }
  for (const point of points) consume(point.coordinates);

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;
  return { minX, minY, maxX, maxY };
}

const round1 = (value: number) => Math.round(value * 10) / 10;

/**
 * viewBox som zoomar in på innehållet (områden, annars punkter) med samma proportioner som
 * kartan, så att den fyller ramen utan kanter. Hela kartan om det inte finns något innehåll.
 */
function autoZoomViewBox(
  features: readonly SwedenMapFeature[],
  points: readonly SwedenMapPoint[],
  project: Project,
  { width, height, padding, pointRadius }: { width: number; height: number; padding: number; pointRadius: number },
): string {
  const fullView = `0 0 ${width} ${height}`;
  const bounds = contentBounds(features, [], project) ?? contentBounds([], points, project);
  if (!bounds) return fullView;

  const zoomPadding = Math.max(padding * 5, pointRadius * 16);
  const minX = Math.max(0, bounds.minX - zoomPadding);
  const minY = Math.max(0, bounds.minY - zoomPadding);
  const maxX = Math.min(width, bounds.maxX + zoomPadding);
  const maxY = Math.min(height, bounds.maxY + zoomPadding);
  let zoomWidth = maxX - minX;
  let zoomHeight = maxY - minY;
  if (zoomWidth <= 0 || zoomHeight <= 0) return fullView;

  const targetRatio = width / height;
  if (zoomWidth / zoomHeight > targetRatio) zoomHeight = zoomWidth / targetRatio;
  else zoomWidth = zoomHeight * targetRatio;
  zoomWidth = Math.min(zoomWidth, width);
  zoomHeight = Math.min(zoomHeight, height);

  const centerX = Math.min(Math.max(minX + (maxX - minX) / 2, zoomWidth / 2), width - zoomWidth / 2);
  const centerY = Math.min(Math.max(minY + (maxY - minY) / 2, zoomHeight / 2), height - zoomHeight / 2);
  return [centerX - zoomWidth / 2, centerY - zoomHeight / 2, zoomWidth, zoomHeight].map(round1).join(" ");
}

function featureId(feature: SwedenMapFeature, index: number): string {
  const propertyId = feature.properties?.id;
  return String(feature.id ?? (typeof propertyId === "string" || typeof propertyId === "number" ? propertyId : index));
}

export function SwedenMap({
  areas,
  overlays = [],
  points = [],
  width = 600,
  height = 900,
  padding = 30,
  areaFillOpacity = 0.3,
  areaStrokeWidth = 1.5,
  pointRadius = 5,
  onPointClick,
  onMapClick,
  selectedPoint,
  showLakeLabels = false,
  title,
  theme,
  className,
  style,
  autoZoom,
  ...svgProps
}: SwedenMapProps) {
  const landClipId = `sweden-land-${useId().replace(/:/g, "")}`;
  const projection = useMemo(() => createProjection(width, height, padding), [width, height, padding]);
  const project: Project = projection.toMap;
  const unproject = projection.toGeoJson;
  const features = areaFeatures(areas);
  // Sveriges land och sjöar är stora polygoner och ändras bara med kartans mått.
  const landPath = useMemo(() => SWEDEN_LAND.map((polygon) => polygonPath(polygon, projection.toMap)).join(""), [projection]);
  const lakesPath = useMemo(() => SWEDEN_LAKES.map((lake) => polygonPath(lake.coordinates, projection.toMap)).join(""), [projection]);

  const viewBox = autoZoom
    ? autoZoomViewBox(features, points, project, { width, height, padding, pointRadius })
    : `0 0 ${width} ${height}`;

  const handleMapClick = (event: MouseEvent<SVGSVGElement>) => {
    if (!onMapClick) return;
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    const [viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight] = viewBox.split(" ").map(Number);
    const x = viewBoxX + ((event.clientX - rect.left) / rect.width) * viewBoxWidth;
    const y = viewBoxY + ((event.clientY - rect.top) / rect.height) * viewBoxHeight;
    onMapClick(unproject(x, y));
  };

  return (
    <svg
      {...svgProps}
      viewBox={viewBox}
      className={["block h-auto w-full", className].filter(Boolean).join(" ")}
      style={{ ...mapThemeStyle(theme), ...style }}
      role={title ? "img" : svgProps.role}
      aria-label={title ?? svgProps["aria-label"]}
      onClick={handleMapClick}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <clipPath id={landClipId}>
          <path d={landPath} fillRule="evenodd" clipRule="evenodd" />
        </clipPath>
      </defs>
      <rect width={width} height={height} fill={PALETTE.paper} />

      <g fill={PALETTE.paperWarm} stroke={PALETTE.ink} strokeWidth={1.4} strokeLinejoin="round">
        <path d={landPath} fillRule="evenodd" />
      </g>

      <g fill={PALETTE.water} stroke={PALETTE.waterLine} strokeWidth={0.9} strokeLinejoin="round">
        <path d={lakesPath} fillRule="evenodd" />
      </g>

      <g
        clipPath={`url(#${landClipId})`}
        fill={PALETTE.areaFill}
        fillOpacity={areaFillOpacity}
        stroke={PALETTE.areaStroke}
        strokeWidth={areaStrokeWidth}
        strokeLinejoin="round"
        pointerEvents="none"
      >
        {features.map((feature, index) =>
          feature.geometry ? (
            <path
              key={featureId(feature, index)}
              data-area-id={featureId(feature, index)}
              d={geometryPath(feature.geometry, project)}
              fillRule="evenodd"
            />
          ) : null,
        )}
      </g>

      <path
        d={landPath}
        fill="none"
        stroke={PALETTE.ink}
        strokeWidth={1.4}
        strokeLinejoin="round"
        pointerEvents="none"
      />

      <g>
        {points.map((point, index) => {
          const [cx, cy] = project(point.coordinates);
          return (
            <g
              key={String(point.id ?? index)}
              data-point-id={String(point.id ?? index)}
              transform={`translate(${cx} ${cy})`}
              onClick={onPointClick ? (event) => {
                event.stopPropagation();
                onPointClick(point);
              } : undefined}
              className={onPointClick ? "cursor-pointer" : undefined}
              role={onPointClick ? "button" : undefined}
              tabIndex={onPointClick ? 0 : undefined}
              onKeyDown={onPointClick ? (event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                onPointClick(point);
              } : undefined}
            >
              <circle
                r={pointRadius * 2.2}
                fill={PALETTE.areaFill}
                fillOpacity={0.2}
              />
              <circle
                r={pointRadius}
                fill={PALETTE.areaFill}
                stroke={PALETTE.ink}
                strokeWidth={1.2}
              />
              <circle r={Math.max(2.2, pointRadius * 0.32)} fill={PALETTE.paper} />
              {point.label ? <title>{point.label}</title> : null}
            </g>
          );
        })}
      </g>

      {overlays.map((overlay) => (
        <g
          key={overlay.id}
          clipPath={`url(#${landClipId})`}
          fill={overlay.fill ?? "none"}
          fillOpacity={overlay.fillOpacity ?? 1}
          stroke={overlay.stroke ?? PALETTE.ink}
          strokeWidth={overlay.strokeWidth ?? 1}
          strokeDasharray={overlay.strokeDasharray}
          strokeLinejoin="round"
          pointerEvents="none"
        >
          {overlay.features.map((feature, index) => feature.geometry ? (
            <path
              key={featureId(feature, index)}
              data-overlay-id={overlay.id}
              d={geometryPath(feature.geometry, project)}
              fillRule="evenodd"
            />
          ) : null)}
        </g>
      ))}

      {selectedPoint ? (() => {
        const [cx, cy] = project(selectedPoint.coordinates);
        return (
          <g transform={`translate(${cx} ${cy})`} pointerEvents="none">
            <circle r={pointRadius * 2.8} fill="none" stroke={PALETTE.areaFill} strokeWidth={1.5} />
            <circle r={pointRadius * 1.1} fill={PALETTE.areaFill} stroke={PALETTE.paper} strokeWidth={1.5} />
          </g>
        );
      })() : null}

      {showLakeLabels ? (
        <g
          fill={PALETTE.inkSoft}
          fontFamily="ui-monospace, monospace"
          fontSize={9}
          letterSpacing={0.8}
          textAnchor="middle"
        >
          {SWEDEN_LAKES.map((lake) => {
            const [x, y] = lakeLabelPosition(lake.coordinates, project);
            return (
              <text key={lake.name} x={x} y={y - 4}>
                {lake.name.toUpperCase()}
              </text>
            );
          })}
        </g>
      ) : null}
    </svg>
  );
}
