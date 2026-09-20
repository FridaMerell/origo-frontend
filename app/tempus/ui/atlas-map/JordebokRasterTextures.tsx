"use client"

import { useEffect } from "react"
import turfDissolve from "@turf/dissolve"
import type { Map as MaplibreMap } from "maplibre-gl"
import type { Feature as TurfFeature, Polygon as TurfPolygon } from "geojson"
import {
	getImage,
	RASTER_ASSETS,
	type RasterAssetKind,
	type RasterSet,
	type RasterSprite,
} from "@/app/tempus/ui/geo-map-canvas/raster-assets"

type Position = [number, number]
type Polygon = Position[][]
type TextureKind = RasterAssetKind
export type RasterPolygonFeature = {
	id: string
	kind: TextureKind
	geometry: { type: "Polygon" | "MultiPolygon"; coordinates: unknown }
}
type TextureProfile = {
	spacing: number
	spacingX?: number
	spacingY?: number
	size: number
	density: number
}
type TextureGroup = {
	kind: TextureKind
	detail: TextureProfile
	overview: TextureProfile
	growsWithZoom?: boolean
	fill?: boolean
	maxStamps?: number
	opacity?: readonly [number, number]
	clip?: boolean
	tileSeamless?: boolean
	// Overrides DETAIL_ZOOM_THRESHOLD for just this group. Agriculture uses
	// this to keep its overview tile (a real, larger field-overview texture)
	// showing across most of the zoom range, only switching to the small
	// furrow detail texture once truly close in.
	detailZoomThreshold?: number
}

const BASE_ZOOM = 16
// Reference zoom the scatter density in drawPolygon is scaled relative to —
// deliberately separate from BASE_ZOOM (that one's just the Mercator
// helpers' fixed projection scale). Every group's spacing/size profile
// values were tuned by eye against this specific reference; changing it
// re-scales the whole map's density, not just this one calculation.
const DENSITY_REFERENCE_ZOOM = 14
// Below this zoom, a group's coarser "overview" profile/sprites are used;
// at or above it, the finer "detail" ones. One threshold shared by every
// group and by both the scatter (drawPolygon) and tile (drawSeamlessGroup)
// renderers, so they switch together.
const DETAIL_ZOOM_THRESHOLD = 12
const TILE_SIZE = 512
const MAX_STAMPS_PER_POLYGON = 260
const MAX_STAMPS_PER_FRAME = 4000
// Agriculture's seamless tile fill (drawSeamlessGroup) shares nothing with
// the per-kind scatter budgets above — it's the only "fill" group — but a
// bigger tile size (fewer, larger furrow tiles covering the same field)
// pairs badly with a tight cap: a large or oddly-clustered field could still
// hit the ceiling before every tile lands, leaving a visible gap instead of
// a fully covered field. Given its own generous headroom instead.
const MAX_STAMPS_PER_FIELD_FRAME = 12000

// Every group here is driven entirely by Lantmäteriet's own land-cover data
// (the `features` prop, from origo-land-cover) — there is no external
// basemap to fall back to outside it. A parcel with no Lantmäteriet coverage
// simply has no texture; that's the whole visible extent of this atlas.
const GROUPS: readonly TextureGroup[] = [
	{
		kind: "agriculture",
		// Smaller spacing = smaller, more numerous tiles = denser texture.
		// Zoomed in (detail) should be the denser one; zoomed out (overview)
		// coarser. (drawSeamlessGroup, which renders this group, sizes each
		// tile directly from `spacing` — its `size` field is unused here,
		// unlike the scatter groups below.)
		detail: { spacing: 58, size: 50, density: 1 },
		overview: { spacing: 90, size: 76, density: 1 },
		fill: true,
		tileSeamless: true,
		opacity: [0.6, 0.6],
		// Unlike the scattered groups, this is a seamless tiled furrow pattern —
		// clipping it exactly to the parcel edge cut furrows off mid-row right
		// at the boundary instead of letting them run the field's full length.
		clip: true,
		// field-overview is the real texture for a field at any normal viewing
		// distance; the small furrow "detail" texture only replaces it once
		// truly zoomed in close. drawSeamlessGroup always stretches each tile
		// to exactly fill its own spacing×spacing grid cell (see its own
		// comment), so raising this threshold to favour the overview tile
		// longer doesn't introduce any gap — adjacent tiles still tile exactly
		// edge-to-edge, just as bigger tiles.
		detailZoomThreshold: 17,
	},
	{
		kind: "grass",
		detail: { spacing: 230, size: 62, density: 0.18 },
		overview: { spacing: 430, size: 52, density: 0.055 },
	},
	{
		kind: "forest",
		detail: { spacing: 130, size: 38, density: 0.82 },
		overview: { spacing: 155, size: 30, density: 0.58 },
		growsWithZoom: true,
		maxStamps: MAX_STAMPS_PER_FRAME,
		opacity: [0.65, 0.7],
		clip: false,
	},
	{
		kind: "mixed-forest",
		detail: { spacing: 130, size: 38, density: 0.82 },
		overview: { spacing: 155, size: 30, density: 0.58 },
		growsWithZoom: true,
		maxStamps: MAX_STAMPS_PER_FRAME,
		opacity: [0.65, 0.8],
		clip: false,
	},
	{
		kind: "deciduous-forest",
		detail: { spacing: 140, size: 34, density: 0.72 },
		overview: { spacing: 175, size: 27, density: 0.5 },
		growsWithZoom: true,
		maxStamps: MAX_STAMPS_PER_FRAME,
		clip: false,
		opacity: [0.65, 0.7],
	},
	{
		kind: "wetland",
		detail: { spacing: 230, size: 36, density: 0.2 },
		overview: { spacing: 430, size: 30, density: 0.06 },
	},
	{
		kind: "open",
		detail: { spacing: 260, size: 102, density: 0.36 },
		overview: { spacing: 460, size: 52, density: 0.05 },
	},
	{
		kind: "general",
		detail: { spacing: 360, size: 28, density: 0.08 },
		overview: { spacing: 520, size: 22, density: 0.04 },
	},
]

function polygons(feature: Pick<RasterPolygonFeature, "geometry">): Polygon[] {
	if (feature.geometry.type === "Polygon")
		return [feature.geometry.coordinates as Position[][]]
	if (feature.geometry.type === "MultiPolygon")
		return feature.geometry.coordinates as Position[][][]
	return []
}

function hash(value: string): number {
	let result = 2166136261
	for (let index = 0; index < value.length; index += 1) {
		result ^= value.charCodeAt(index)
		result = Math.imul(result, 16777619)
	}
	return result >>> 0
}

function random(seed: number) {
	let value = seed >>> 0
	return () => {
		value += 0x6d2b79f5
		let next = value
		next = Math.imul(next ^ (next >>> 15), next | 1)
		next ^= next + Math.imul(next ^ (next >>> 7), next | 61)
		return ((next ^ (next >>> 14)) >>> 0) / 4294967296
	}
}

function worldPoint([lng, lat]: Position): Position {
	const scale = TILE_SIZE * 2 ** BASE_ZOOM
	const x = ((lng + 180) / 360) * scale
	const radians = (lat * Math.PI) / 180
	const y = ((1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2) * scale
	return [x, y]
}

function lngLat([x, y]: Position): Position {
	const scale = TILE_SIZE * 2 ** BASE_ZOOM
	const lng = (x / scale) * 360 - 180
	const latitude =
		Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / scale))) * (180 / Math.PI)
	return [lng, latitude]
}

function insideRing([x, y]: Position, ring: readonly Position[]) {
	let inside = false
	for (
		let index = 0, previous = ring.length - 1;
		index < ring.length;
		previous = index++
	) {
		const [xi, yi] = ring[index]!
		const [xj, yj] = ring[previous]!
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
			inside = !inside
	}
	return inside
}

// The grid only ever iterates the polygon's axis-aligned bounding box, so for
// a concave or irregular shape most bbox cells sit outside the actual
// outline. Clipping used to be the only thing hiding those — turning clip off
// (to let tree crowns overflow into a neighbouring polygon) also removed that
// filter, so candidates scattered across the whole bbox instead of just the
// polygon. Filtering candidates to the real polygon keeps that scatter
// contained while still letting a sprite anchored near the edge visually
// spill over the boundary once drawn.
function insidePolygon(point: Position, polygon: Polygon) {
	return Boolean(
		polygon[0] &&
		insideRing(point, polygon[0]) &&
		!polygon.slice(1).some(ring => insideRing(point, ring)),
	)
}

function polygonKey(kind: TextureKind, polygon: Polygon) {
	const ring = polygon[0] ?? []
	return `${kind}:${ring
		.slice(0, 5)
		.map(([lng, lat]) => `${lng.toFixed(6)},${lat.toFixed(6)}`)
		.join("|")}`
}

// Used only for the ink border's outline (see below), never for the fill —
// the fill's seam problem is solved at the canvas level by clipping every
// same-kind polygon in one nonzero-wound pass (drawSeamlessGroup), which
// stays correct even where buffered parcels now overlap instead of just
// touching. This dissolve gives the ink line a true, single outer boundary
// to trace instead of tracing every source parcel's edge separately (which
// would draw a doubled line right along the old seam). It must only run when
// `features` changes, never inside the per-frame draw() loop — dissolve is
// synchronous and heavy enough to freeze the tab if run every animation
// frame. If it fails on degenerate/overlapping input, skip the ink border
// for that render rather than risk drawing it wrong.
function dissolveByKind(features: readonly RasterPolygonFeature[], kind: TextureKind): Polygon[] {
	const flat: TurfFeature<TurfPolygon>[] = []
	for (const feature of features) {
		if (feature.kind !== kind) continue
		for (const polygon of polygons(feature)) {
			flat.push({ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: polygon as unknown as TurfPolygon["coordinates"] } })
		}
	}
	if (!flat.length) return []
	try {
		const dissolved = turfDissolve({ type: "FeatureCollection", features: flat })
		return dissolved.features.flatMap((feature) =>
			feature.geometry.type === "Polygon"
				? [feature.geometry.coordinates as unknown as Polygon]
				: (feature.geometry.coordinates as unknown as Polygon[]),
		)
	} catch {
		return []
	}
}

function inkOutline(context: CanvasRenderingContext2D, map: MaplibreMap, polygon: Polygon, seedKey: string) {
	context.save()
	context.strokeStyle = "rgba(95, 72, 44, 0.6)"
	context.lineWidth = 1
	context.lineJoin = "round"
	context.lineCap = "round"
	polygon.forEach((ring, ringIndex) => {
		const jitter = random(hash(`${seedKey}:ink:${ringIndex}`))
		context.beginPath()
		ring.forEach(([lng, lat], index) => {
			const point = map.project([lng, lat])
			const dx = (jitter() - 0.5) * 0.9
			const dy = (jitter() - 0.5) * 0.9
			if (index === 0) context.moveTo(point.x + dx, point.y + dy)
			else context.lineTo(point.x + dx, point.y + dy)
		})
		context.closePath()
		context.stroke()
	})
	context.restore()
}

function screenPath(
	context: CanvasRenderingContext2D,
	map: MaplibreMap,
	polygon: Polygon,
) {
	context.beginPath()
	for (const ring of polygon) {
		ring.forEach(([lng, lat], index) => {
			const point = map.project([lng, lat])
			if (index === 0) context.moveTo(point.x, point.y)
			else context.lineTo(point.x, point.y)
		})
		context.closePath()
	}
}

// Forest/mixed-forest/deciduous-forest are drawn with clip:false so a tree
// anchored near a field's edge can still visually spill into the next
// parcel — but with no clip at all, that same overflow spilled straight
// across a neighbouring wetland pond, painting trees over sankmark. Erasing
// the wetland polygons from the canvas after the unclipped forest stamps
// (but before wetland draws its own texture on top) removes just that
// bleed, without reintroducing a hard clip on the forest groups themselves.
function erasePolygon(context: CanvasRenderingContext2D, map: MaplibreMap, polygon: Polygon) {
	context.save()
	context.globalCompositeOperation = "destination-out"
	screenPath(context, map, polygon)
	context.fill("evenodd")
	context.restore()
}

// The detail/overview split applies independently to a group's grid
// spacing (pickProfile) and its sprite set (pickVariants) — same threshold,
// two different things being chosen, so kept as two small functions rather
// than one that returns both.
function pickProfile(group: TextureGroup, zoom: number): TextureProfile {
	return zoom < (group.detailZoomThreshold ?? DETAIL_ZOOM_THRESHOLD) ? group.overview : group.detail
}

// spacingX/spacingY only exist on a profile when a group needs anisotropic
// spacing (agriculture's rows); every other group just sets `spacing` and
// relies on this falling back to it for both axes.
function resolveSpacing(profile: TextureProfile): { x: number; y: number } {
	return { x: profile.spacingX ?? profile.spacing, y: profile.spacingY ?? profile.spacing }
}

function pickVariants(rasterSet: RasterSet, zoom: number, threshold: number = DETAIL_ZOOM_THRESHOLD): readonly RasterSprite[] {
	if (zoom >= threshold) return rasterSet.detailVariants?.length ? rasterSet.detailVariants : rasterSet.variants
	return rasterSet.overviewVariants?.length ? rasterSet.overviewVariants : rasterSet.variants
}

function worldBounds(polygon: Polygon) {
	let minX = Infinity
	let minY = Infinity
	let maxX = -Infinity
	let maxY = -Infinity
	for (const ring of polygon)
		for (const position of ring) {
			const [x, y] = worldPoint(position)
			minX = Math.min(minX, x)
			minY = Math.min(minY, y)
			maxX = Math.max(maxX, x)
			maxY = Math.max(maxY, y)
		}
	return { minX, minY, maxX, maxY }
}

// drawSeamlessGroup grids over the COMBINED bounding box of whatever polygons
// it's given. Passing it every same-kind polygon in the whole locale at once
// made that box span the entire locale whenever two fields sat far apart —
// grid cell count grows with the box's area, so a few small, distant fields
// could blow up into a near-unbounded number of candidate cells even though
// almost all of them fall in the empty gap between the fields and get
// clipped away unseen. Clustering by bounding-box proximity first keeps each
// drawSeamlessGroup call scoped to one local group of actually-adjacent
// parcels, so the combined-clip fix for double-stamped overlaps stays cheap.
function clusterPolygonsByBounds(polygonList: readonly Polygon[]): Polygon[][] {
	const bounds = polygonList.map(worldBounds)
	const parent = bounds.map((_, index) => index)
	function find(index: number): number {
		while (parent[index] !== index) {
			parent[index] = parent[parent[index]!]!
			index = parent[index]!
		}
		return index
	}
	function union(a: number, b: number) {
		const rootA = find(a)
		const rootB = find(b)
		if (rootA !== rootB) parent[rootA] = rootB
	}
	for (let i = 0; i < bounds.length; i += 1) {
		for (let j = i + 1; j < bounds.length; j += 1) {
			const a = bounds[i]!
			const b = bounds[j]!
			if (a.minX <= b.maxX && b.minX <= a.maxX && a.minY <= b.maxY && b.minY <= a.maxY) union(i, j)
		}
	}
	const clusters = new Map<number, Polygon[]>()
	polygonList.forEach((polygon, index) => {
		const root = find(index)
		const cluster = clusters.get(root)
		if (cluster) cluster.push(polygon)
		else clusters.set(root, [polygon])
	})
	return [...clusters.values()]
}

function screenPathMulti(
	context: CanvasRenderingContext2D,
	map: MaplibreMap,
	polygons: readonly Polygon[],
) {
	context.beginPath()
	for (const polygon of polygons) {
		for (const ring of polygon) {
			ring.forEach(([lng, lat], index) => {
				const point = map.project([lng, lat])
				if (index === 0) context.moveTo(point.x, point.y)
				else context.lineTo(point.x, point.y)
			})
			context.closePath()
		}
	}
}

function worldBoundsMulti(polygons: readonly Polygon[]) {
	let minX = Infinity
	let minY = Infinity
	let maxX = -Infinity
	let maxY = -Infinity
	for (const polygon of polygons) {
		const bounds = worldBounds(polygon)
		minX = Math.min(minX, bounds.minX)
		minY = Math.min(minY, bounds.minY)
		maxX = Math.max(maxX, bounds.maxX)
		maxY = Math.max(maxY, bounds.maxY)
	}
	return { minX, minY, maxX, maxY }
}

// Buffering land-cover polygons to close gaps between neighbouring parcels
// (LocaleAtlasMap) means same-kind parcels can now genuinely overlap instead
// of just touching. Clipping and stamping each one separately (drawPolygon)
// then double-stamps the overlap lens — two independent semi-transparent
// passes compound there, showing up as a visibly darker/different band right
// where two parcels used to just touch. Clipping ALL of a kind's polygons in
// one nonzero-wound path instead treats overlap and touching identically: the
// canvas only ever clips to "inside at least one of them", so the one grid
// pass that follows stamps that whole union exactly once. This sidesteps
// needing a real geometric union (dissolve) to succeed for the fill itself —
// dissolve is still used separately, only for the ink border's outline.
function drawSeamlessGroup(
	context: CanvasRenderingContext2D,
	map: MaplibreMap,
	groupPolygons: readonly Polygon[],
	rasterSet: RasterSet,
	spacingX: number,
	spacingY: number,
	opacity: readonly [number, number] | undefined,
	clip: boolean,
	budget: { stamps: number },
	redraw: () => void,
	detailZoomThreshold: number,
) {
	if (!groupPolygons.length) return
	const bounds = worldBoundsMulti(groupPolygons)
	if (!Number.isFinite(bounds.minX)) return

	context.save()
	if (clip) {
		screenPathMulti(context, map, groupPolygons)
		context.clip("nonzero")
	}

	const firstColumn = Math.floor(bounds.minX / spacingX)
	const lastColumn = Math.ceil(bounds.maxX / spacingX)
	const firstRow = Math.floor(bounds.minY / spacingY)
	const lastRow = Math.ceil(bounds.maxY / spacingY)
	// No fallback sprite left to reach for here on purpose (see
	// RASTER_ASSETS.agriculture) — better to draw nothing than the wrong,
	// badly-stretched one.
	const sprite = pickVariants(rasterSet, map.getZoom(), detailZoomThreshold)[0]
	if (!sprite) { context.restore(); return }
	const image = getImage(sprite, redraw)
	if (!image) { context.restore(); return }
	const screenScale = 2 ** (map.getZoom() - BASE_ZOOM)
	const width = spacingX * screenScale
	const height = spacingY * screenScale
	context.globalAlpha = opacity ? opacity[1] : 1

	for (
		let column = firstColumn;
		column <= lastColumn && budget.stamps < MAX_STAMPS_PER_FIELD_FRAME;
		column += 1
	) {
		for (
			let row = firstRow;
			row <= lastRow && budget.stamps < MAX_STAMPS_PER_FIELD_FRAME;
			row += 1
		) {
			const x = (column + 0.5) * spacingX
			const y = (row + 0.5) * spacingY
			const [lng, lat] = lngLat([x, y])
			const point = map.project([lng, lat])
			context.drawImage(image, point.x - width / 2, point.y - height / 2, width, height)
			budget.stamps += 1
		}
	}
	context.restore()
}

function drawPolygon(
	context: CanvasRenderingContext2D,
	map: MaplibreMap,
	polygon: Polygon,
	key: string,
	rasterSet: RasterSet,
	spacingX: number,
	spacingY: number,
	size: number,
	density: number,
	fill: boolean,
	maxStamps: number,
	growsWithZoom: boolean,
	opacity: readonly [number, number] | undefined,
	clip: boolean,
	budget: { stamps: number },
	redraw: () => void,
) {
	const bounds = worldBounds(polygon)
	if (!Number.isFinite(bounds.minX)) return

	// The candidate grid used to cover the polygon's FULL extent regardless of
	// how much of it is actually on screen. For one large polygon (a big
	// locale's forest parcel, say) that meant every frame's shared stamp
	// budget was spent scanning candidates across the whole shape — most of
	// them off-screen — before ever reaching the part currently in view.
	// Zoomed in, where the visible slice of a large polygon shrinks and the
	// grid gets much denser (smaller effectiveSpacing below), that off-screen
	// scanning could burn through the entire per-kind budget without a single
	// stamp landing in the visible viewport, which looked like fewer and
	// fewer rasters the further in you zoomed — the opposite of the density
	// profile's intent. Clamping the grid to the current viewport (with a
	// small margin so edge stamps still pop in smoothly while panning/
	// zooming) keeps the budget spent on what can actually be seen.
	const viewBounds = map.getBounds()
	const [westX] = worldPoint([viewBounds.getWest(), 0])
	const [eastX] = worldPoint([viewBounds.getEast(), 0])
	const [, northY] = worldPoint([0, viewBounds.getNorth()])
	const [, southY] = worldPoint([0, viewBounds.getSouth()])
	const viewMinX = Math.min(westX, eastX)
	const viewMaxX = Math.max(westX, eastX)
	const viewMinY = Math.min(northY, southY)
	const viewMaxY = Math.max(northY, southY)
	const margin = Math.max(spacingX, spacingY) * 2
	const clampedMinX = Math.max(bounds.minX, viewMinX - margin)
	const clampedMaxX = Math.min(bounds.maxX, viewMaxX + margin)
	const clampedMinY = Math.max(bounds.minY, viewMinY - margin)
	const clampedMaxY = Math.min(bounds.maxY, viewMaxY + margin)
	if (clampedMinX > clampedMaxX || clampedMinY > clampedMaxY) return

	context.save()
	if (clip) {
		screenPath(context, map, polygon)
		context.clip("evenodd")
	}

	// The column/row grid lives in BASE_ZOOM world-pixel space (a fixed
	// coordinate system, independent of the current zoom) rather than screen
	// space, so that a given point on the ground always hashes to the same
	// column/row/seed — see the `hash(key:column:row)` call below — and its
	// scatter pattern stays visually stable while zooming, instead of
	// reshuffling every frame the way a screen-space grid would.
	// `spacingX`/`spacingY` on each group were tuned by eye against this exact
	// conversion (zoom relative to DENSITY_REFERENCE_ZOOM), so it keeps the
	// same on-screen appearance those values were chosen for — changing the
	// reference zoom would silently re-scale every group's already-tuned
	// density.
	const effectiveSpacingX = spacingX / 2 ** (map.getZoom() - DENSITY_REFERENCE_ZOOM)
	const effectiveSpacingY = spacingY / 2 ** (map.getZoom() - DENSITY_REFERENCE_ZOOM)
	const firstColumn = Math.floor(clampedMinX / effectiveSpacingX)
	const lastColumn = Math.ceil(clampedMaxX / effectiveSpacingX)
	const firstRow = Math.floor(clampedMinY / effectiveSpacingY)
	const lastRow = Math.ceil(clampedMaxY / effectiveSpacingY)
	const stampLimit = maxStamps
	let stamps = 0
	const variants = pickVariants(rasterSet, map.getZoom())

	for (
		let column = firstColumn;
		column <= lastColumn &&
		stamps < stampLimit &&
		budget.stamps < MAX_STAMPS_PER_FRAME;
		column += 1
	) {
		for (
			let row = firstRow;
			row <= lastRow &&
			stamps < stampLimit &&
			budget.stamps < MAX_STAMPS_PER_FRAME;
			row += 1
		) {
			const sample = random(hash(`${key}:${column}:${row}`))
			if (!fill && sample() > rasterSet.keep * density) continue

			const sprite = variants[Math.floor(sample() * variants.length)]!
			const image = getImage(sprite, redraw)
			if (!image) continue

			const x = (column + 0.16 + sample() * 0.68) * effectiveSpacingX
			const y = (row + 0.16 + sample() * 0.68) * effectiveSpacingY
			const [lng, lat] = lngLat([x, y])
			if (!insidePolygon([lng, lat], polygon)) continue
			const point = map.project([lng, lat])
			// Capped at 1.4 (not higher) — a fully zoomed-in conifer/mixed-forest
			// sprite (size 38 × up to 1.4 × up to 1.08 random) stays close
			// enough to the grid's own on-screen spacing (spacingX/4, a fixed
			// ~19-30px regardless of zoom) that crowns overlap the way a
			// continuous canopy should, without collapsing into an
			// undifferentiated blob.
			const zoomScale = growsWithZoom
				? Math.min(1.4, Math.max(0.78, 0.78 + (map.getZoom() - 11) * 0.16))
				: 1
			const width = size * zoomScale * (0.76 + sample() * 0.32)
			const height = width * (sprite.height / sprite.width)
			const [minimumOpacity, maximumOpacity] = opacity ?? [0.65, 0.8]
			context.globalAlpha =
				minimumOpacity + sample() * (maximumOpacity - minimumOpacity)
			context.drawImage(
				image,
				point.x - width / 2,
				point.y - height,
				width,
				height,
			)
			stamps += 1
			budget.stamps += 1
		}
	}
	context.restore()
}

/**
 * Transparent Canvas layer for the locale atlas. It samples only the
 * locale's own Lantmäteriet land-cover features, clips every stamp to its
 * polygon, and does not alter the base style or its geometry.
 */
export function JordebokRasterTextures({
	map,
	features,
}: {
	map: MaplibreMap
	features: readonly RasterPolygonFeature[]
}) {
	useEffect(() => {
		const canvas = document.createElement("canvas")
		canvas.setAttribute("aria-hidden", "true")
		canvas.style.cssText =
			"inset:0;pointer-events:none;position:absolute;z-index:1;transform-origin:0 0"
		map.getContainer().appendChild(canvas)

		// Computed once per `features` change, not per animation frame.
		// `rawSeamlessClustersByKind` (unmerged, as buffered, grouped into
		// locally-adjacent clusters) drives the actual fill via
		// drawSeamlessGroup's combined clip per cluster, which handles overlap
		// correctly without needing dissolve to succeed. `seamlessPolygonsByKind`
		// (dissolved) is used only for tracing the ink border's outline.
		const rawSeamlessClustersByKind = new Map<TextureKind, Polygon[][]>()
		const seamlessPolygonsByKind = new Map<TextureKind, Polygon[]>()
		for (const group of GROUPS) {
			if (!group.tileSeamless) continue
			const raw = features.filter((feature) => feature.kind === group.kind).flatMap(polygons)
			rawSeamlessClustersByKind.set(group.kind, clusterPolygonsByBounds(raw))
			seamlessPolygonsByKind.set(group.kind, dissolveByKind(features, group.kind))
		}

		let frame: number | null = null
		let disposed = false
		let dragAnchor: {
			location: ReturnType<MaplibreMap["getCenter"]>
			point: { x: number; y: number }
			zoom: number
		} | null = null
		let lastRenderKey = ""
		let sourceDirty = true
		let textureDirty = false

		const schedule = () => {
			if (frame !== null || disposed || dragAnchor) return
			frame = requestAnimationFrame(() => {
				frame = null
				draw()
			})
		}

		const draw = () => {
			const container = map.getContainer()
			const dpr = window.devicePixelRatio || 1
			const width = container.clientWidth
			const height = container.clientHeight
			const center = map.getCenter()
			const renderKey = `${map.getZoom().toFixed(2)}:${center.lng.toFixed(5)}:${center.lat.toFixed(5)}:${width}:${height}`
			if (renderKey === lastRenderKey && !sourceDirty && !textureDirty) return
			lastRenderKey = renderKey
			sourceDirty = false
			textureDirty = false
			canvas.width = Math.round(width * dpr)
			canvas.height = Math.round(height * dpr)
			canvas.style.width = `${width}px`
			canvas.style.height = `${height}px`
			canvas.style.transform = ""
			const context = canvas.getContext("2d")
			if (!context) return

			context.setTransform(dpr, 0, 0, dpr, 0, 0)
			context.clearRect(0, 0, width, height)

			// Each land-cover kind gets its own stamp budget rather than sharing
			// one pool — a dominant kind (e.g. coniferous forest, first in GROUPS
			// and often the largest area on a big locale) could otherwise exhaust
			// the whole per-frame budget before a less common kind listed later
			// (e.g. deciduous forest) ever got a single stamp drawn.
			const markBudgets = new Map<TextureKind, { stamps: number }>()
			const budgetForKind = (kind: TextureKind) => {
				let budget = markBudgets.get(kind)
				if (!budget) { budget = { stamps: 0 }; markBudgets.set(kind, budget) }
				return budget
			}
			const fieldBudget = { stamps: 0 }
			const onImageReady = () => {
				textureDirty = true
				schedule()
			}
			const seen = new Set<string>()
			const drawTextured = (entry: { group: TextureGroup; rasterSet: RasterSet; polygon: Polygon; key: string }) => {
				const { group, rasterSet, polygon, key } = entry
				const budget = group.fill ? fieldBudget : budgetForKind(group.kind)
				if (budget.stamps >= MAX_STAMPS_PER_FRAME) return
				const profile = pickProfile(group, map.getZoom())
				const spacing = resolveSpacing(profile)
				drawPolygon(
					context,
					map,
					polygon,
					key,
					rasterSet,
					spacing.x,
					spacing.y,
					profile.size,
					profile.density,
					group.fill === true,
					group.maxStamps ?? (group.fill ? MAX_STAMPS_PER_FRAME : MAX_STAMPS_PER_POLYGON),
					group.growsWithZoom === true,
					group.opacity,
					group.clip !== false,
					budget,
					onImageReady,
				)
			}

			// Tile-seamless groups (agriculture's furrows) drawn first — they
			// used to run after the scatter groups, which meant a field's
			// furrows could paint straight over a neighbouring parcel's stamps.
			// Drawing them first means every scatter group below paints back
			// over any such overlap.
			for (const group of GROUPS) {
				if (!group.tileSeamless) continue
				const rasterSet = RASTER_ASSETS[group.kind]
				if (!rasterSet) continue
				const profile = pickProfile(group, map.getZoom())
				const spacing = resolveSpacing(profile)
				for (const cluster of rawSeamlessClustersByKind.get(group.kind) ?? []) {
					if (fieldBudget.stamps >= MAX_STAMPS_PER_FIELD_FRAME) break
					drawSeamlessGroup(
						context,
						map,
						cluster,
						rasterSet,
						spacing.x,
						spacing.y,
						group.opacity,
						group.clip !== false,
						fieldBudget,
						onImageReady,
						group.detailZoomThreshold ?? DETAIL_ZOOM_THRESHOLD,
					)
				}
				// Drawn after the fill so the hand-inked edge sits crisply on top —
				// traced along the dissolved (seam-free) outline so it never doubles
				// a line along a now-merged internal parcel edge. Skipped (rather
				// than tracing the raw, possibly-overlapping polygons) if dissolve
				// couldn't produce one for this frame.
				for (const polygon of seamlessPolygonsByKind.get(group.kind) ?? []) {
					inkOutline(context, map, polygon, group.kind)
				}
			}

			const texturedPolygons: {
				group: TextureGroup
				rasterSet: RasterSet
				polygon: Polygon
				key: string
			}[] = []
			for (const group of GROUPS) {
				const rasterSet = RASTER_ASSETS[group.kind]
				if (!rasterSet) continue
				if (group.tileSeamless) continue
				for (const feature of features) {
					if (feature.kind !== group.kind) continue
					for (const polygon of polygons(feature)) {
						const key = `${feature.id}:${polygonKey(group.kind, polygon)}`
						if (seen.has(key)) continue
						seen.add(key)
						texturedPolygons.push({ group, rasterSet, polygon, key })
					}
				}
			}

			// Wetland is drawn last, with the unclipped forest groups' bleed onto
			// it erased in between — see erasePolygon's comment above.
			for (const entry of texturedPolygons) if (entry.group.kind !== "wetland") drawTextured(entry)
			for (const entry of texturedPolygons) if (entry.group.kind === "wetland") erasePolygon(context, map, entry.polygon)
			for (const entry of texturedPolygons) if (entry.group.kind === "wetland") drawTextured(entry)
		}

		const beginMove = () => {
			const location = map.getCenter()
			const point = map.project(location)
			dragAnchor = { location, point, zoom: map.getZoom() }
		}

		const followMove = () => {
			if (!dragAnchor) return
			const point = map.project(dragAnchor.location)
			// This map only ever animates zoom (the +/- buttons, fitBounds on
			// load) — no pan — but "move" still fires during a zoom animation.
			// Translating without also scaling left the frozen raster canvas at
			// its old zoom level while MapLibre's own vector layers (the polygon
			// fill/clip) rescale every frame, so during the animation the stamps
			// visibly drifted out of alignment with the polygon underneath until
			// the next full redraw.
			const scale = 2 ** (map.getZoom() - dragAnchor.zoom)
			const x = point.x - dragAnchor.point.x * scale
			const y = point.y - dragAnchor.point.y * scale
			canvas.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`
		}

		const finishMove = () => {
			dragAnchor = null
			schedule()
		}

		const markSourceDirty = () => {
			sourceDirty = true
			schedule()
		}

		map.on("movestart", beginMove)
		map.on("move", followMove)
		map.on("moveend", finishMove)
		map.on("idle", schedule)
		map.on("sourcedata", markSourceDirty)
		map.on("resize", schedule)
		schedule()

		return () => {
			disposed = true
			if (frame !== null) cancelAnimationFrame(frame)
			map.off("movestart", beginMove)
			map.off("move", followMove)
			map.off("moveend", finishMove)
			map.off("idle", schedule)
			map.off("sourcedata", markSourceDirty)
			map.off("resize", schedule)
			canvas.remove()
		}
	}, [map, features])

	return null
}
