import { SWEDEN_LAND } from "./sweden-data";
import type {
  GeoJsonPolygonGeometry,
  GeoJsonPosition,
  SwedenMapFeature,
  SwedenMapFeatureCollection,
} from "./SwedenMap";

const REFERENCE_LATITUDE = 62.2;
const LONGITUDE_SCALE = Math.cos((REFERENCE_LATITUDE * Math.PI) / 180);

type ProjectedBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
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

export function createProjection(width: number, height: number, padding: number) {
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

export function openRing(geometry?: GeoJsonPolygonGeometry | null): GeoJsonPosition[] {
  const ring = geometry?.coordinates[0];
  if (!ring?.length) return [];

  const points = [...ring];
  const first = points[0];
  const last = points.at(-1);
  if (first && last && first[0] === last[0] && first[1] === last[1]) points.pop();
  return points.map((point) => [...point] as GeoJsonPosition);
}

export function polygonFromPoints(points: readonly GeoJsonPosition[]): GeoJsonPolygonGeometry | null {
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

export function pointInPolygon(
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

export function areaFeatures(
  areas: SwedenMapFeatureCollection | readonly SwedenMapFeature[] | undefined,
): readonly SwedenMapFeature[] {
  if (!areas) return [];
  if (Array.isArray(areas)) return areas;
  return (areas as SwedenMapFeatureCollection).features;
}
