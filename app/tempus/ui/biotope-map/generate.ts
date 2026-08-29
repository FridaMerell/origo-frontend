import { isoLines, simplify, smooth, toPath, type Pt } from "./contour";
import { DEFAULT_COMPASS_ARTWORK } from "./compass";
import { Noise2D, hashToSeed, mulberry32 } from "./noise";
import { PALETTE, type El, type LayerId, type MapOptions, type Scene } from "./types";

const CELL = 5; // px per grid cell

type Ctx = {
  cols: number;
  rows: number;
  cell: number;
  field: Float32Array;
  sea: Uint8Array;
  waterLevel: number;
  rand: () => number;
  noise: Noise2D;
  opts: MapOptions;
  elements: El[];
  /** water mask in pixel space (lakes + sea + rivers), used to protect base map */
  wet: Uint8Array;
  keepout: Uint8Array; // where glyph features may not be drawn
  roadMask: Uint8Array; // existing road corridors, so new roads don't tangle
  layer: LayerId;
  coast?: Float32Array;
};

/** every element is stamped with the layer that is currently being drawn */
function push(c: Ctx, el: El) {
  c.elements.push({ ...el, layer: c.layer } as El);
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);


function idx(c: Ctx, x: number, y: number) {
  const cx = Math.max(0, Math.min(c.cols - 1, Math.round(x)));
  const cy = Math.max(0, Math.min(c.rows - 1, Math.round(y)));
  return cy * c.cols + cx;
}

const elevAt = (c: Ctx, x: number, y: number) => c.field[idx(c, x, y)]!;
const isWet = (c: Ctx, x: number, y: number) => c.wet[idx(c, x, y)] === 1;
const isBlocked = (c: Ctx, x: number, y: number) =>
  c.wet[idx(c, x, y)] === 1 || c.keepout[idx(c, x, y)] === 1;

function markDisc(mask: Uint8Array, c: Ctx, x: number, y: number, r: number) {
  const r2 = r * r;
  for (let j = Math.floor(y - r); j <= y + r; j++) {
    if (j < 0 || j >= c.rows) continue;
    for (let i = Math.floor(x - r); i <= x + r; i++) {
      if (i < 0 || i >= c.cols) continue;
      const dx = i - x;
      const dy = j - y;
      if (dx * dx + dy * dy <= r2) mask[j * c.cols + i] = 1;
    }
  }
}

/* ---------------------------------------------------------------- field */

type Profile = {
  freq: number;
  octaves: number;
  amp: number;
  ridged?: boolean;
  waterLevel: number;
  steps: number; // base number of contour levels
  major: number; // every n-th contour is a major (rust) line
};

const PROFILES: Record<string, Profile> = {
  boreal: { freq: 2.2, octaves: 4, amp: 0.85, waterLevel: 0.16, steps: 12, major: 4 },
  lakes: { freq: 2.6, octaves: 4, amp: 0.9, waterLevel: 0.27, steps: 12, major: 4 },
  rivers: { freq: 2.0, octaves: 5, amp: 0.9, waterLevel: 0.1, steps: 14, major: 4 },
  seashore: { freq: 2.4, octaves: 4, amp: 0.55, waterLevel: 0.04, steps: 11, major: 4 },
  marsh: { freq: 1.6, octaves: 3, amp: 0.3, waterLevel: 0.28, steps: 8, major: 4 },
  agricultural: { freq: 1.5, octaves: 3, amp: 0.4, waterLevel: 0.05, steps: 9, major: 3 },
  meadow: { freq: 1.7, octaves: 3, amp: 0.45, waterLevel: 0.04, steps: 10, major: 4 },
  mountains: { freq: 2.8, octaves: 6, amp: 1, ridged: true, waterLevel: 0.02, steps: 22, major: 5 },
};

function buildField(c: Ctx, p: Profile) {
  const { cols, rows, noise, opts } = c;
  const ar = cols / rows;

  // hills / valleys are baked into the elevation model so they never occlude
  // the base map — they *are* part of the terrain.
  const bumps: { x: number; y: number; r: number; a: number; irr?: number }[] = [];
  const n = Math.round(1 + c.opts.featureAmount * 0.35);
  if (opts.features.hills) {
    for (let i = 0; i < n; i++)
      bumps.push({
        x: c.rand() * cols,
        y: c.rand() * rows,
        r: (0.12 + c.rand() * 0.16) * cols,
        a: 0.3 + c.rand() * 0.35,
      });
  }
  if (opts.features.valleys) {
    for (let i = 0; i < n; i++)
      bumps.push({
        x: c.rand() * cols,
        y: c.rand() * rows,
        r: (0.14 + c.rand() * 0.2) * cols,
        a: -(0.28 + c.rand() * 0.32),
      });
  }
  if (opts.features.ponds) {
    // lakes: sized generously so they read as water bodies, not dimples.
    // `irr` tags them for angular wobble below so shorelines come out
    // irregular and blobby instead of smooth ellipses
    const w = 0.7 + opts.waterStrength / 10;
    for (let i = 0; i < Math.round(2 + opts.featureAmount * 0.45); i++)
      bumps.push({
        x: (0.1 + c.rand() * 0.8) * cols,
        y: (0.1 + c.rand() * 0.8) * rows,
        r: (0.07 + c.rand() * 0.1) * cols * w,
        a: -(0.75 + c.rand() * 0.4),
        irr: c.rand() * 100,
      });
  }

  const ox = c.rand() * 100;
  const oy = c.rand() * 100;

  // wavy coastline stored per row so land, sea and the drawn shore agree
  if (opts.biotope === "seashore") {
    c.coast = new Float32Array(rows);
    const phase = c.rand() * 50;
    const bend = 0.06 + (opts.waterStrength / 10) * 0.16;
    const shift = 0.78 - (opts.waterStrength / 10) * 0.34;
    for (let y = 0; y < rows; y++) {
      const v = y / rows;
      c.coast[y] =
        cols *
        (shift + bend * noise.fbm(v * 2.1 + phase, phase * 0.3, 3) + bend * 0.3 * noise.fbm(v * 6 + phase, 9, 2));
    }
  }


  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const u = (x / cols) * ar;
      const v = y / rows;
      let e = noise.fbm(u * p.freq + ox, v * p.freq + oy, p.octaves);
      if (p.ridged) e = 1 - Math.abs(e) * 1.7;
      e = e * 0.5 + 0.5;
      e = 0.5 + (e - 0.5) * p.amp;

      if (c.coast) {
        // land rises away from the coast on the right-hand side
        const d = (c.coast[y]! - x) / (cols * 0.6);
        e = clamp01(e * 0.52 + clamp01(d) * 0.8);
        if (x > c.coast[y]!) c.sea[y * cols + x] = 1;
      }

      for (const b of bumps) {
        const dx = x - b.x;
        const dy = (y - b.y) * (cols / rows) * (rows / cols);
        let d = Math.hypot(dx, dy);
        if (b.irr !== undefined && d < b.r * 1.8) {
          // modulate radius by angle: low-freq lobes + high-freq crinkle
          const ang = Math.atan2(dy, dx);
          const lobe =
            0.28 * Math.sin(ang * 2 + b.irr) +
            0.18 * Math.sin(ang * 3 + b.irr * 1.7) +
            0.1 * Math.sin(ang * 5 + b.irr * 2.3);
          d /= 1 + lobe;
        }
        const q = d / b.r;
        if (q < 1.6) e += b.a * Math.exp(-q * q * 1.6);
      }

      c.field[y * cols + x] = clamp01(e);
    }
  }
}


/* -------------------------------------------------------------- drawing */

function pxLine(c: Ctx, pts: Pt[]) {
  return pts.map(([x, y]) => [x * c.cell, y * c.cell] as Pt);
}

/** split a polyline wherever it enters water so contours never cross it */
function clipDry(c: Ctx, pts: Pt[]): Pt[][] {
  const out: Pt[][] = [];
  let cur: Pt[] = [];
  for (const p of pts) {
    if (c.sea[idx(c, p[0], p[1])] === 1) {
      if (cur.length > 2) out.push(cur);
      cur = [];
    } else cur.push(p);
  }
  if (cur.length > 2) out.push(cur);
  return out;
}

function drawContours(c: Ctx, p: Profile) {
  const steps = Math.max(4, Math.round(p.steps * (0.45 + c.opts.detail / 10)));
  for (let i = 1; i < steps; i++) {
    const level = i / steps;
    if (level <= c.waterLevel) continue;
    const major = i % p.major === 0;
    const lines = isoLines(c.field, c.cols, c.rows, level);
    for (const raw of lines) {
      const sm = smooth(raw, 2);
      for (const part of clipDry(c, sm)) {
        if (part.length < 4) continue;
        push(c, {
          t: "path",
          d: toPath(simplify(pxLine(c, part))),
          s: major ? PALETTE.contourMajor : PALETTE.contourMinor,
          w: major ? 0.85 : 0.6,
          o: major ? 0.85 : 0.7,
          f: "none",
        });
      }
    }
  }
}

/** iso-lines of a field where the outer ring is forced above `level`,
 *  so every extracted region is a closed loop we can fill. */
function closedRegions(c: Ctx, field: Float32Array, level: number): Pt[][] {
  const f = Float32Array.from(field);
  const hi = level - 1; // outer ring is forced *below* the level so regions close inward
  for (let x = 0; x < c.cols; x++) {
    f[x] = hi;
    f[(c.rows - 1) * c.cols + x] = hi;
  }
  for (let y = 0; y < c.rows; y++) {
    f[y * c.cols] = hi;
    f[y * c.cols + c.cols - 1] = hi;
  }
  const out: Pt[][] = [];
  for (const raw of isoLines(f, c.cols, c.rows, level)) {
    if (raw.length < 8) continue;
    const first = raw[0]!;
    const last = raw[raw.length - 1]!;
    if (Math.hypot(first[0] - last[0], first[1] - last[1]) > 3) continue;
    out.push(raw);
  }
  return out;
}

function drawWaterBodies(c: Ctx) {
  // water = everything *below* the water level, so invert the field
  const inv = Float32Array.from(c.field, (v) => 1 - v);
  for (const raw of closedRegions(c, inv, 1 - c.waterLevel)) {
    const sm = smooth(raw, 2);
    push(c, {
      t: "path",
      d: toPath(pxLine(c, sm), true),
      f: PALETTE.water,
      s: PALETTE.waterLine,
      w: 0.9,
    });
    for (const [x, y] of raw) markDisc(c.wet, c, x, y, 0.8);
    floodMarkInterior(c, sm);
  }
}

/** faint green wash under wooded ground */
function drawForestShade(c: Ctx, ox: number, threshold: number) {
  const f = new Float32Array(c.cols * c.rows);
  for (let y = 0; y < c.rows; y++) {
    for (let x = 0; x < c.cols; x++) {
      const n = c.noise.fbm(x * 0.035 + ox, y * 0.035 + ox, 3);
      const i = y * c.cols + x;
      // washes are laid down before water is drawn, so read the field directly
      const wet =
        c.wet[i] === 1 || c.sea[i] === 1 || c.field[i]! < c.waterLevel + 0.02;
      f[i] = wet ? -1 : n;
    }
  }
  for (const raw of closedRegions(c, f, threshold)) {
    if (raw.length < 24) continue;
    const sm = smooth(raw, 3);
    push(c, {
      t: "path",
      d: toPath(pxLine(c, sm), true),
      f: PALETTE.forest,
      s: "none",
      o: 0.55,
    });
  }
}



/** crude interior marking: scanline fill of a closed polygon into the wet mask */
function floodMarkInterior(c: Ctx, poly: Pt[]) {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [, y] of poly) {
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
    const xs: number[] = [];
    for (let i = 0; i < poly.length - 1; i++) {
      const a = poly[i]!;
      const b = poly[i + 1]!;
      if (a[1] === b[1]) continue;
      if (y >= Math.min(a[1], b[1]) && y < Math.max(a[1], b[1])) {
        xs.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
    }
    xs.sort((m, n) => m - n);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.floor(xs[k]!); x <= Math.ceil(xs[k + 1]!); x++) {
        if (x >= 0 && x < c.cols && y >= 0 && y < c.rows) c.wet[y * c.cols + x] = 1;
      }
    }
  }
}

function drawSea(c: Ctx) {
  const coast = c.coast;
  if (!coast) return;
  const pts: Pt[] = [];
  for (let y = 0; y < c.rows; y++) pts.push([coast[y]!, y]);
  const sm = smooth(pts, 3);
  const poly = pxLine(c, sm);
  const W = c.cols * c.cell;
  const H = c.rows * c.cell;
  const d = toPath(poly) + `L${W} ${H}L${W} 0Z`;
  push(c, { t: "path", d, f: PALETTE.sea, s: "none" });
  push(c, { t: "path", d: toPath(poly), s: PALETTE.ink, w: 1.1, f: "none", o: 0.55 });
  for (let k = 1; k <= 3; k++) {
    const off = poly.map(([x, y]) => [x + k * 8, y] as Pt);
    push(c, {
      t: "path",
      d: toPath(off),
      s: PALETTE.waterLine,
      w: 0.5,
      o: 0.45 - k * 0.08,
      f: "none",
    });
  }
  for (let y = 0; y < c.rows; y++)
    for (let x = 0; x < c.cols; x++) if (c.sea[y * c.cols + x] === 1) c.wet[y * c.cols + x] = 1;
}

/* --------------------------------------------------------------- rivers */

function traceRiver(c: Ctx, sx: number, sy: number, len: number): Pt[] {
  const pts: Pt[] = [[sx, sy]];
  let x = sx;
  let y = sy;
  for (let i = 0; i < len; i++) {
    const e = elevAt(c, x, y);
    const gx = elevAt(c, x + 1.5, y) - elevAt(c, x - 1.5, y);
    const gy = elevAt(c, x, y + 1.5) - elevAt(c, x, y - 1.5);
    const m = Math.hypot(gx, gy) || 1e-6;
    const wob = (c.rand() - 0.5) * 0.9;
    x += (-gx / m) * 1.4 + wob;
    y += (-gy / m) * 1.4 + wob * 0.6;
    if (x < 0 || y < 0 || x > c.cols - 1 || y > c.rows - 1) break;
    pts.push([x, y]);
    if (e < c.waterLevel + 0.02 || c.sea[idx(c, x, y)] === 1) break;
  }
  return pts;
}

function drawRivers(c: Ctx, count: number) {
  for (let i = 0; i < count; i++) {
    let best: Pt = [c.rand() * c.cols, c.rand() * c.rows];
    for (let k = 0; k < 40; k++) {
      const cand: Pt = [c.rand() * c.cols, c.rand() * c.rows];
      if (elevAt(c, cand[0], cand[1]) > elevAt(c, best[0], best[1])) best = cand;
    }
    const path = traceRiver(c, best[0], best[1], 260);
    if (path.length < 12) continue;
    const sm = smooth(path, 3);
    const px = pxLine(c, sm);
    push(c, { t: "path", d: toPath(px), s: PALETTE.waterLine, w: 1.6, f: "none" });
    push(c, { t: "path", d: toPath(px), s: PALETTE.paperWarm, w: 0.5, f: "none", o: 0.6 });
    for (const [x, y] of sm) markDisc(c.wet, c, x, y, 1.2);
  }
}

/* --------------------------------------------------------------- glyphs */

function scatter(
  c: Ctx,
  density: number,
  test: (x: number, y: number) => boolean,
  draw: (x: number, y: number, s: number) => void,
) {
  const step = Math.max(3, 14 - density);
  for (let y = 2; y < c.rows - 2; y += step) {
    for (let x = 2; x < c.cols - 2; x += step) {
      const jx = x + (c.rand() - 0.5) * step * 1.1;
      const jy = y + (c.rand() - 0.5) * step * 1.1;
      if (jx < 2 || jy < 2 || jx > c.cols - 3 || jy > c.rows - 3) continue;
      if (isBlocked(c, jx, jy)) continue;
      if (!test(jx, jy)) continue;
      draw(jx * c.cell, jy * c.cell, 0.85 + c.rand() * 0.4);
    }
  }
}

function treeGlyph(c: Ctx, x: number, y: number, s: number) {
  const h = 11 * s;
  const w = 3.6 * s;
  let d = `M${x.toFixed(1)} ${(y + h * 0.28).toFixed(1)}L${x.toFixed(1)} ${(y - h * 0.72).toFixed(1)}`;
  for (let i = 0; i < 3; i++) {
    const ly = y - h * 0.62 + (i * h) / 3.4;
    const lw = w * (0.45 + i * 0.28);
    d += `M${(x - lw).toFixed(1)} ${(ly + lw * 0.75).toFixed(1)}L${x.toFixed(1)} ${ly.toFixed(1)}L${(x + lw).toFixed(1)} ${(ly + lw * 0.75).toFixed(1)}`;
  }
  push(c, { t: "path", d, s: PALETTE.ink, w: 0.55, f: "none", o: 0.75 });
}

function tuftGlyph(c: Ctx, x: number, y: number, s: number) {
  const h = 4.5 * s;
  const d =
    `M${(x - 2.4).toFixed(1)} ${y.toFixed(1)}L${(x - 1.6).toFixed(1)} ${(y - h * 0.7).toFixed(1)}` +
    `M${x.toFixed(1)} ${y.toFixed(1)}L${x.toFixed(1)} ${(y - h).toFixed(1)}` +
    `M${(x + 2.4).toFixed(1)} ${y.toFixed(1)}L${(x + 1.6).toFixed(1)} ${(y - h * 0.7).toFixed(1)}`;
  push(c, { t: "path", d, s: PALETTE.inkSoft, w: 0.5, f: "none", o: 0.85 });
}

function marshGlyph(c: Ctx, x: number, y: number, s: number) {
  const w = 5 * s;
  let d = "";
  for (let i = 0; i < 3; i++) {
    const yy = y + i * 2.2;
    const ww = w * (i === 1 ? 1 : 0.62);
    d += `M${(x - ww / 2).toFixed(1)} ${yy.toFixed(1)}L${(x + ww / 2).toFixed(1)} ${yy.toFixed(1)}`;
  }
  push(c, { t: "path", d, s: PALETTE.waterLine, w: 0.6, f: "none", o: 0.9 });
}

/* ----------------------------------------------------------- agriculture */

function drawParcels(c: Ctx) {
  const W = c.cols * c.cell;
  const H = c.rows * c.cell;
  const ang = (c.rand() - 0.5) * 0.5;
  const cos = Math.cos(ang);
  const sin = Math.sin(ang);
  const gap = 62 + c.rand() * 26;
  const rot = (x: number, y: number): Pt => [
    W / 2 + (x - W / 2) * cos - (y - H / 2) * sin,
    H / 2 + (x - W / 2) * sin + (y - H / 2) * cos,
  ];
  for (let gx = -H; gx < W + H; gx += gap) {
    const jitter = (c.rand() - 0.5) * 10;
    const a = rot(gx + jitter, -H);
    const b = rot(gx + jitter, H * 2);
    push(c, {
      t: "path",
      d: toPath([a, b]),
      s: PALETTE.ink,
      w: 0.55,
      o: 0.35,
      f: "none",
    });
  }
  for (let gy = -W; gy < H + W; gy += gap * (1.1 + c.rand() * 0.6)) {
    const a = rot(-W, gy);
    const b = rot(W * 2, gy);
    push(c, {
      t: "path",
      d: toPath([a, b]),
      s: PALETTE.ink,
      w: 0.5,
      o: 0.28,
      f: "none",
      ...(c.rand() > 0.6 ? { dash: "5 4" } : {}),
    });
  }
}

/* ---------------------------------------------------------------- roads */

function renderRoad(c: Ctx, pts: Pt[], main: boolean, skipStart: number) {
  // break the road wherever it would run through water, or where it would
  // run along an existing road (junctions are allowed, tangles are not)
  const segs: Pt[][] = [];
  let cur: Pt[] = [];
  pts.forEach((p, i) => {
    const overlap = i > skipStart && c.roadMask[idx(c, p[0], p[1])] === 1;
    if (isWet(c, p[0], p[1]) || overlap) {
      if (cur.length > 4) segs.push(cur);
      cur = [];
      return;
    }
    cur.push(p);
  });
  if (cur.length > 4) segs.push(cur);

  for (const seg of segs) {
    const px = pxLine(c, seg);
    push(c, { t: "path", d: toPath(px), s: PALETTE.paperWarm, w: main ? 5 : 3.6, f: "none" });
    push(c, {
      t: "path",
      d: toPath(px),
      s: PALETTE.ink,
      w: main ? 0.95 : 0.7,
      f: "none",
      o: main ? 0.72 : 0.55,
      dash: main ? "8 4" : "5 4",
    });
    for (const [x, y] of seg) {
      markDisc(c.keepout, c, x, y, 1.8);
      markDisc(c.roadMask, c, x, y, 2.2);
    }
  }
}

/** a road that follows the terrain: it prefers to keep its elevation, like a real track */
function traceRoad(c: Ctx, start: Pt, dir: Pt, len: number): Pt[] {
  const pts: Pt[] = [start];
  let [x, y] = start;
  let [dx, dy] = dir;
  const target = elevAt(c, x, y);
  for (let i = 0; i < len; i++) {
    const gx = elevAt(c, x + 2, y) - elevAt(c, x - 2, y);
    const gy = elevAt(c, x, y + 2) - elevAt(c, x, y - 2);
    const e = elevAt(c, x, y);
    // steer gently back toward the starting contour, plus a slow wander
    const pull = (e - target) * 6;
    const wob = c.noise.fbm(i * 0.06, x * 0.01 + y * 0.01, 2) * 0.35;
    let nx = dx - gx * pull + -dy * wob;
    let ny = dy - gy * pull + dx * wob;
    const m = Math.hypot(nx, ny) || 1e-6;
    nx /= m;
    ny /= m;
    // limit turn rate so roads stay smooth and never loop back on themselves
    dx = dx * 0.86 + nx * 0.14;
    dy = dy * 0.86 + ny * 0.14;
    const dm = Math.hypot(dx, dy) || 1e-6;
    dx /= dm;
    dy /= dm;
    x += dx * 2.2;
    y += dy * 2.2;
    if (x < 1 || y < 1 || x > c.cols - 2 || y > c.rows - 2) break;
    pts.push([x, y]);
  }
  return pts;
}

function drawRoads(c: Ctx, branches: number) {
  // one through-road across the map, then branches that leave it at a junction
  const fromLeft = c.rand() > 0.5;
  const start: Pt = fromLeft
    ? [1, (0.2 + c.rand() * 0.6) * c.rows]
    : [(0.2 + c.rand() * 0.6) * c.cols, 1];
  const dir: Pt = fromLeft ? [1, (c.rand() - 0.5) * 0.5] : [(c.rand() - 0.5) * 0.5, 1];
  const dm = Math.hypot(dir[0], dir[1]);
  const main = smooth(traceRoad(c, start, [dir[0] / dm, dir[1] / dm], 320), 3);
  renderRoad(c, main, true, 0);

  for (let i = 0; i < branches; i++) {
    if (main.length < 30) break;
    const at = main[Math.floor((0.2 + c.rand() * 0.6) * main.length)]!;
    const prev = main[Math.max(0, main.indexOf(at) - 1)] ?? at;
    // leave the main road roughly perpendicular so junctions read clearly
    let bx = -(at[1] - prev[1]);
    let by = at[0] - prev[0];
    const m = Math.hypot(bx, by) || 1e-6;
    const sign = c.rand() > 0.5 ? 1 : -1;
    bx = (bx / m) * sign;
    by = (by / m) * sign;
    const spur = smooth(traceRoad(c, at, [bx, by], 90 + Math.round(c.rand() * 70)), 3);
    renderRoad(c, spur, false, 10);
  }
}

/* -------------------------------------------------------------- compass */

/** Compass rose adapted from the supplied 400x400 SVG. */
function drawCompass(c: Ctx, useSuppliedSvg = true) {
  const R = 36;
  // Fixed bottom-right placement with a small inset to prevent clipping.
  const fx = 0.95;
  const fy = 0.92;
  const cx = Math.round(fx * c.cols) * c.cell;
  const cy = Math.round(fy * c.rows) * c.cell;
  markDisc(c.keepout, c, fx * c.cols, fy * c.rows, R / c.cell + 2);

  if (useSuppliedSvg) {
    const [minX, minY, width, height] = DEFAULT_COMPASS_ARTWORK.viewBox;
    const scale = Math.min((R * 2) / width, (R * 2) / height);
    const artworkTransform =
      `translate(${cx} ${cy}) scale(${scale}) translate(${-(minX + width / 2)} ${-(minY + height / 2)})`;

    for (const path of DEFAULT_COMPASS_ARTWORK.paths) {
      push(c, {
        t: "path",
        d: path.d,
        f: path.fill,
        s: DEFAULT_COMPASS_ARTWORK.stroke,
        w: DEFAULT_COMPASS_ARTWORK.strokeWidth,
        transform: [artworkTransform, path.transform].filter(Boolean).join(" "),
      });
    }
    return;
  }

  const ink = PALETTE.ink;
  const warm = PALETTE.paperWarm;

  const circle = (r: number, w: number, o: number, s = ink) =>
    push(c, {
      t: "path",
      d: `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`,
      s,
      w,
      o,
      f: "none",
    });

  // paper disc behind the rose so it sits cleanly over the base map
  push(c, {
    t: "path",
    d: `M${cx - R} ${cy}A${R} ${R} 0 1 0 ${cx + R} ${cy}A${R} ${R} 0 1 0 ${cx - R} ${cy}Z`,
    f: warm,
    s: "none",
    o: 0.88,
  });

  circle(R, 0.8, 0.85);
  circle(R - 2.5, 0.45, 0.6);
  circle(R * 0.42, 0.55, 0.8);
  circle(R * 0.14, 0.45, 0.7);

  // degree ticks on the outer rim
  let ticks = "";
  for (let i = 0; i < 72; i++) {
    const a = (i * Math.PI * 2) / 72;
    const len = i % 18 === 0 ? 6 : i % 6 === 0 ? 4 : 2.2;
    const x1 = cx + Math.cos(a) * (R - 2.5);
    const y1 = cy + Math.sin(a) * (R - 2.5);
    const x2 = cx + Math.cos(a) * (R - 2.5 - len);
    const y2 = cy + Math.sin(a) * (R - 2.5 - len);
    ticks += `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }
  push(c, { t: "path", d: ticks, s: ink, w: 0.45, o: 0.7, f: "none" });

  // 16-point star: long cardinal points, shorter ordinal ones.
  // each point is a slim kite, half inked / half open, like old engravings
  const star = (k: number, rLong: number, rHalf: number, wBase: number, inkFill: boolean) => {
    for (let i = 0; i < k; i++) {
      const a = (i * Math.PI * 2) / k - Math.PI / 2;
      const px = Math.cos(a + Math.PI / 2);
      const py = Math.sin(a + Math.PI / 2);
      const tx = cx + Math.cos(a) * rLong;
      const ty = cy + Math.sin(a) * rLong;
      const mx = cx + Math.cos(a) * rHalf;
      const my = cy + Math.sin(a) * rHalf;
      const b1x = cx + px * wBase;
      const b1y = cy + py * wBase;
      const b2x = cx - px * wBase;
      const b2y = cy - py * wBase;
      const fmt = (v: number) => v.toFixed(1);
      // dark half
      push(c, {
        t: "path",
        d: `M${fmt(b1x)} ${fmt(b1y)}L${fmt(tx)} ${fmt(ty)}L${fmt(mx)} ${fmt(my)}L${fmt(cx)} ${fmt(cy)}Z`,
        f: inkFill ? ink : "none",
        s: ink,
        w: 0.5,
        o: inkFill ? 0.82 : 0.7,
      });
      // light half
      push(c, {
        t: "path",
        d: `M${fmt(b2x)} ${fmt(b2y)}L${fmt(tx)} ${fmt(ty)}L${fmt(mx)} ${fmt(my)}L${fmt(cx)} ${fmt(cy)}Z`,
        f: "none",
        s: ink,
        w: 0.45,
        o: 0.55,
      });
    }
  };
  star(8, R * 0.42, R * 0.1, 2.4, false); // short inner points
  star(4, R - 5, R * 0.42, 4.2, true); // long N E S W points

  // fleur-de-lis style north marker above the ring
  const ny = cy - R - 4;
  push(c, {
    t: "path",
    d:
      `M${cx} ${ny - 11}C${cx - 4.5} ${ny - 5} ${cx - 4.5} ${ny + 1} ${cx} ${ny + 5}` +
      `C${cx + 4.5} ${ny + 1} ${cx + 4.5} ${ny - 5} ${cx} ${ny - 11}Z` +
      `M${cx - 6.5} ${ny + 2}Q${cx} ${ny + 4.5} ${cx + 6.5} ${ny + 2}`,
    f: ink,
    s: ink,
    w: 0.5,
    o: 0.85,
  });
  push(c, {
    t: "text",
    x: cx,
    y: ny - 16,
    str: "N",
    size: 11,
    f: ink,
    ls: 1,
    anchor: "middle",
  });
}

/* -------------------------------------------------------------- compose */

export function generateMap(opts: MapOptions): Scene {
  const cell = CELL;
  const cols = Math.round(opts.width / cell);
  const rows = Math.round(opts.height / cell);
  const rand = mulberry32(hashToSeed(opts.seed));
  const p = PROFILES[opts.biotope]!;

  const water = opts.waterStrength / 5; // 0.2 .. 2, 1 = default
  const relief = 0.5 + opts.relief / 10; // 0.6 .. 1.5

  const c: Ctx = {
    cols,
    rows,
    cell,
    field: new Float32Array(cols * rows),
    sea: new Uint8Array(cols * rows),
    wet: new Uint8Array(cols * rows),
    keepout: new Uint8Array(cols * rows),
    roadMask: new Uint8Array(cols * rows),
    waterLevel: clamp01(p.waterLevel * water),
    layer: "paper",
    rand,
    noise: new Noise2D(rand),
    opts,
    elements: [],
  };

  buildField(c, { ...p, amp: p.amp * relief });

  const W = cols * cell;
  const H = rows * cell;
  push(c, { t: "rect", x: 0, y: 0, w: W, h: H, f: PALETTE.paper });

  // washes go down first so contours, labels and glyphs stay readable on top
  c.layer = "texture";
  if (opts.biotope === "boreal") drawForestShade(c, 0, 0.05);
  c.layer = "trees";
  if (opts.features.trees) drawForestShade(c, 53, 0.12);

  c.layer = "water";
  if (opts.biotope === "seashore") drawSea(c);
  c.layer = "texture";
  if (opts.biotope === "agricultural") drawParcels(c);

  c.layer = "water";
  drawWaterBodies(c);
  c.layer = "contours";
  drawContours(c, p);

  c.layer = "rivers";
  const riverBoost = Math.max(0, Math.round((opts.waterStrength - 5) / 3));
  if (opts.biotope === "rivers") drawRivers(c, 2 + Math.round(rand() * 2) + riverBoost);
  else if (opts.biotope !== "seashore" && opts.biotope !== "marsh")
    drawRivers(c, rand() > 1 - opts.waterStrength / 12 ? 1 + riverBoost : 0);

  // biotope-inherent texture (part of the base map)
  const amt = opts.featureAmount;
  c.layer = "texture";
  if (opts.biotope === "boreal") {
    scatter(c, 7, () => rand() > 0.15, (x, y, s) => treeGlyph(c, x, y, s));
  }
  if (opts.biotope === "marsh")
    scatter(c, 8, () => rand() > 0.2, (x, y, s) => marshGlyph(c, x, y, s));
  if (opts.biotope === "meadow" || opts.biotope === "agricultural")
    scatter(c, 7, () => rand() > 0.35, (x, y, s) => tuftGlyph(c, x, y, s));

  // optional features — drawn only on clear ground, never over water or roads
  c.layer = "roads";
  if (opts.features.roads) drawRoads(c, Math.round(amt / 3));
  c.layer = "trees";
  if (opts.features.trees) {
    scatter(
      c,
      Math.round(2 + amt * 0.7),
      (x, y) => c.noise.fbm(x * 0.04, y * 0.04, 2) > -0.15,
      (x, y, s) => treeGlyph(c, x, y, s),
    );
  }
  c.layer = "meadows";
  if (opts.features.meadows)
    scatter(
      c,
      Math.round(2 + amt * 0.6),
      (x, y) => c.noise.fbm(x * 0.05 + 31, y * 0.05 + 17, 2) > 0.08,
      (x, y, s) => tuftGlyph(c, x, y, s),
    );

  c.layer = "annotation";

  if (opts.compass) drawCompass(c);

  if (opts.frame) {
    push(c, {
      t: "rect",
      x: 10.5,
      y: 10.5,
      w: W - 21,
      h: H - 21,
      f: "none",
      s: PALETTE.ink,
      sw: 0.7,
    });
  }
  if (opts.label) {
    push(c, {
      t: "text",
      x: 22,
      y: H - 22,
      str: opts.biotope.toUpperCase(),
      size: 9,
      f: PALETTE.ink,
      ls: 3,
    });
  }

  return { width: W, height: H, elements: c.elements };
}
