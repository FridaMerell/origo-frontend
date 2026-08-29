export type Pt = [number, number];

/** Extract iso-lines from a scalar grid using marching squares, stitched into polylines. */
export function isoLines(
  field: Float32Array,
  cols: number,
  rows: number,
  level: number,
): Pt[][] {
  const at = (x: number, y: number) => field[y * cols + x]!;
  const segs: [Pt, Pt][] = [];

  const ip = (
    ax: number,
    ay: number,
    av: number,
    bx: number,
    by: number,
    bv: number,
  ): Pt => {
    const t = (level - av) / (bv - av || 1e-6);
    return [ax + (bx - ax) * t, ay + (by - ay) * t];
  };

  for (let y = 0; y < rows - 1; y++) {
    for (let x = 0; x < cols - 1; x++) {
      const tl = at(x, y);
      const tr = at(x + 1, y);
      const br = at(x + 1, y + 1);
      const bl = at(x, y + 1);
      let idx = 0;
      if (tl > level) idx |= 8;
      if (tr > level) idx |= 4;
      if (br > level) idx |= 2;
      if (bl > level) idx |= 1;
      if (idx === 0 || idx === 15) continue;

      const top = () => ip(x, y, tl, x + 1, y, tr);
      const right = () => ip(x + 1, y, tr, x + 1, y + 1, br);
      const bottom = () => ip(x, y + 1, bl, x + 1, y + 1, br);
      const left = () => ip(x, y, tl, x, y + 1, bl);

      switch (idx) {
        case 1:
        case 14:
          segs.push([left(), bottom()]);
          break;
        case 2:
        case 13:
          segs.push([bottom(), right()]);
          break;
        case 3:
        case 12:
          segs.push([left(), right()]);
          break;
        case 4:
        case 11:
          segs.push([top(), right()]);
          break;
        case 6:
        case 9:
          segs.push([top(), bottom()]);
          break;
        case 7:
        case 8:
          segs.push([left(), top()]);
          break;
        case 5:
          segs.push([left(), top()]);
          segs.push([bottom(), right()]);
          break;
        case 10:
          segs.push([left(), bottom()]);
          segs.push([top(), right()]);
          break;
      }
    }
  }

  return stitch(segs);
}

const key = (p: Pt) => `${p[0].toFixed(4)}|${p[1].toFixed(4)}`;

function stitch(segs: [Pt, Pt][]): Pt[][] {
  const map = new Map<string, number[]>();
  segs.forEach(([a, b], i) => {
    for (const k of [key(a), key(b)]) {
      const arr = map.get(k);
      if (arr) arr.push(i);
      else map.set(k, [i]);
    }
  });

  const used = new Array(segs.length).fill(false);
  const lines: Pt[][] = [];

  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    const [a, b] = segs[i]!;
    const line: Pt[] = [a, b];

    // extend forward then backward
    for (let dir = 0; dir < 2; dir++) {
      let endPt = dir === 0 ? b : a;
      for (;;) {
        const cands = map.get(key(endPt)) ?? [];
        const next = cands.find((j) => !used[j]);
        if (next === undefined) break;
        used[next] = true;
        const [na, nb] = segs[next]!;
        const cont: Pt = key(na) === key(endPt) ? nb : na;
        if (dir === 0) line.push(cont);
        else line.unshift(cont);
        endPt = cont;
      }
    }
    if (line.length > 2) lines.push(line);
  }
  return lines;
}

/** Chaikin smoothing for organic, hand-drawn contour feel. */
export function smooth(points: Pt[], iterations = 2): Pt[] {
  let pts = points;
  const closed =
    pts.length > 3 &&
    Math.hypot(pts[0]![0] - pts[pts.length - 1]![0], pts[0]![1] - pts[pts.length - 1]![1]) < 1e-6;
  for (let it = 0; it < iterations; it++) {
    const out: Pt[] = [];
    if (!closed) out.push(pts[0]!);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      out.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    if (!closed) out.push(pts[pts.length - 1]!);
    else out.push(out[0]!);
    pts = out;
  }
  return pts;
}

/** Remove points that do not materially change the rendered line. */
export function simplify(points: Pt[], tolerance = 0.75): Pt[] {
  if (points.length <= 2) return points;

  const first = points[0]!;
  const last = points[points.length - 1]!;
  const dx = last[0] - first[0];
  const dy = last[1] - first[1];
  const lengthSquared = dx * dx + dy * dy;
  let furthestIndex = -1;
  let furthestDistanceSquared = tolerance * tolerance;

  for (let i = 1; i < points.length - 1; i++) {
    const point = points[i]!;
    let t = lengthSquared
      ? ((point[0] - first[0]) * dx + (point[1] - first[1]) * dy) / lengthSquared
      : 0;
    t = Math.max(0, Math.min(1, t));
    const offsetX = point[0] - (first[0] + dx * t);
    const offsetY = point[1] - (first[1] + dy * t);
    const distanceSquared = offsetX * offsetX + offsetY * offsetY;
    if (distanceSquared > furthestDistanceSquared) {
      furthestDistanceSquared = distanceSquared;
      furthestIndex = i;
    }
  }

  if (furthestIndex === -1) return [first, last];
  const before = simplify(points.slice(0, furthestIndex + 1), tolerance);
  const after = simplify(points.slice(furthestIndex), tolerance);
  return [...before.slice(0, -1), ...after];
}

const coordinate = (value: number) => String(Math.round(value * 10) / 10);

export function toPath(points: Pt[], close = false): string {
  if (!points.length) return "";
  let d = `M${coordinate(points[0]![0])} ${coordinate(points[0]![1])}`;
  for (let i = 1; i < points.length; i++) {
    d += `L${coordinate(points[i]![0])} ${coordinate(points[i]![1])}`;
  }
  return close ? d + "Z" : d;
}
