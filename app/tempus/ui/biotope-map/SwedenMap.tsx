import { useId, type ComponentPropsWithoutRef } from "react";
import { SWEDEN_LAKES, SWEDEN_LAND, type PolygonCoordinates } from "./sweden-data";
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

export type SwedenMapProps = Omit<
  ComponentPropsWithoutRef<"svg">,
  "children" | "width" | "height" | "points"
> & {
  areas?: SwedenMapFeatureCollection | readonly SwedenMapFeature[];
  points?: readonly SwedenMapPoint[];
  width?: number;
  height?: number;
  padding?: number;
  areaFillOpacity?: number;
  areaStrokeWidth?: number;
  pointRadius?: number;
  showLakeLabels?: boolean;
  title?: string | undefined;
  theme?: Partial<MapTheme> | undefined;
};

type Project = (position: readonly number[]) => readonly [number, number];

const REFERENCE_LATITUDE = 62.2;
const LONGITUDE_SCALE = Math.cos((REFERENCE_LATITUDE * Math.PI) / 180);

function projected(position: readonly number[]): readonly [number, number] {
  return [position[0]! * LONGITUDE_SCALE, -position[1]!];
}

function landBounds() {
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

function createProject(width: number, height: number, padding: number): Project {
  const availableWidth = Math.max(1, width - padding * 2);
  const availableHeight = Math.max(1, height - padding * 2);
  const dataWidth = BOUNDS.maxX - BOUNDS.minX;
  const dataHeight = BOUNDS.maxY - BOUNDS.minY;
  const scale = Math.min(availableWidth / dataWidth, availableHeight / dataHeight);
  const offsetX = padding + (availableWidth - dataWidth * scale) / 2;
  const offsetY = padding + (availableHeight - dataHeight * scale) / 2;

  return (position) => {
    const [x, y] = projected(position);
    return [offsetX + (x - BOUNDS.minX) * scale, offsetY + (y - BOUNDS.minY) * scale];
  };
}

function ringPath(ring: readonly (readonly number[])[], project: Project): string {
  return ring
    .map((position, index) => {
      const [x, y] = project(position);
      return `${index === 0 ? "M" : "L"}${Math.round(x * 10) / 10} ${Math.round(y * 10) / 10}`;
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

function areaFeatures(areas: SwedenMapProps["areas"]): readonly SwedenMapFeature[] {
  if (!areas) return [];
  if (Array.isArray(areas)) return areas;
  return (areas as SwedenMapFeatureCollection).features;
}

function featureId(feature: SwedenMapFeature, index: number): string {
  const propertyId = feature.properties?.id;
  return String(feature.id ?? (typeof propertyId === "string" || typeof propertyId === "number" ? propertyId : index));
}

export function SwedenMap({
  areas,
  points = [],
  width = 600,
  height = 900,
  padding = 30,
  areaFillOpacity = 0.3,
  areaStrokeWidth = 1.5,
  pointRadius = 5,
  showLakeLabels = false,
  title,
  theme,
  className,
  style,
  ...svgProps
}: SwedenMapProps) {
  const landClipId = `sweden-land-${useId().replace(/:/g, "")}`;
  const project = createProject(width, height, padding);
  const features = areaFeatures(areas);
  const landPath = SWEDEN_LAND.map((polygon) => polygonPath(polygon, project)).join("");
  const lakesPath = SWEDEN_LAKES.map((lake) => polygonPath(lake.coordinates, project)).join("");

  return (
    <svg
      {...svgProps}
      viewBox={`0 0 ${width} ${height}`}
      className={["block h-auto w-full", className].filter(Boolean).join(" ")}
      style={{ ...mapThemeStyle(theme), ...style }}
      role={title ? "img" : svgProps.role}
      aria-label={title ?? svgProps["aria-label"]}
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
