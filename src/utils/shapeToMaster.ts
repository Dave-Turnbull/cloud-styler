import type { Ellipse } from './puffs';

export const CANVAS_W = 680;
export const CANVAS_H = 340;
export const MAX_UNDO = 20;

// ── Interior puff constants ────────────────────────────────────────────────────
const GRID_STEP = 30;
const MAX_RADIUS = 64;
const MIN_DIST = 8;
const INTERIOR_Y_SHIFT = -0.12;
const THICK_THRESHOLD = 48;
const THICK_MIN_SEP = 1.0;

// Fine pass: catch small features (single brush dots ~20px) that fall between
// main-grid points. Only fires for thin regions where dist < FINE_MAX_DIST.
const FINE_STEP = 10;
const FINE_MAX_DIST = 24;     // max dist to be considered a thin/small feature
const FINE_COVER_MULT = 2.0;  // existing puff blocks fine candidate within r×this

// ── Base puff constants ────────────────────────────────────────────────────────
const HORIZ_TOLERANCE = 28;
const MIN_BASE_SEGMENT = 60;
const BASE_HEIGHT_FRAC = 0.40;
const MAX_BASE_RY = 44;
const BASE_OVERHANG = 22;

/** Returned by shapeToMaster — ellipses plus how many of them are base puffs. */
export interface MasterShape {
  ellipses: Ellipse[];
  baseCount: number;   // number of leading ellipses that are flat base puffs
}

function bfsDistanceTransform(data: Uint8ClampedArray, w: number, h: number): Uint16Array {
  const dist = new Uint16Array(w * h).fill(65535);
  const queue: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (data[i * 4 + 3] < 128) continue;
      const onEdge = x === 0 || x === w - 1 || y === 0 || y === h - 1;
      const adjEmpty =
        (x > 0     && data[(i - 1) * 4 + 3] < 128) ||
        (x < w - 1 && data[(i + 1) * 4 + 3] < 128) ||
        (y > 0     && data[(i - w) * 4 + 3] < 128) ||
        (y < h - 1 && data[(i + w) * 4 + 3] < 128);
      if (onEdge || adjEmpty) { dist[i] = 1; queue.push(i); }
    }
  }
  let head = 0;
  while (head < queue.length) {
    const i = queue[head++];
    const d = dist[i];
    const x = i % w;
    const y = (i / w) | 0;
    if (x > 0     && data[(i-1)*4+3] >= 128 && dist[i-1] > d+1) { dist[i-1] = d+1; queue.push(i-1); }
    if (x < w - 1 && data[(i+1)*4+3] >= 128 && dist[i+1] > d+1) { dist[i+1] = d+1; queue.push(i+1); }
    if (y > 0     && data[(i-w)*4+3] >= 128 && dist[i-w] > d+1) { dist[i-w] = d+1; queue.push(i-w); }
    if (y < h - 1 && data[(i+w)*4+3] >= 128 && dist[i+w] > d+1) { dist[i+w] = d+1; queue.push(i+w); }
  }
  return dist;
}

/**
 * Convert painted canvas pixels into master ellipses for buildPuffs.
 *
 * Pass 1 — base puffs:
 *   Find the globally deepest bottom-edge row (maxBottomY). Columns whose
 *   lowest painted pixel is within HORIZ_TOLERANCE of maxBottomY are
 *   "horizontal"; they're grouped into segments that each become one wide
 *   flat ellipse (ry derived from local shape height, not dist at the edge).
 *
 * Pass 2 — interior puffs (main grid):
 *   GRID_STEP=30 regular grid, radius from dist transform, skipping the base
 *   zone and enforcing a min-separation in thick regions.
 *
 * Pass 3 — interior puffs (fine grid):
 *   FINE_STEP=10 scan restricted to thin features (dist < FINE_MAX_DIST) not
 *   already covered by a main-grid puff. Ensures single small brush dots
 *   (radius ≈20px) always produce at least one puff even if no main-grid
 *   point landed inside them.
 *
 * Interior puffs are sorted by cx (left→right) so SVG stacking naturally
 * places left puffs behind right ones. buildPuffs reverses them for puffDir.
 */
export function shapeToMaster(imageData: ImageData): MasterShape {
  const { data, width, height } = imageData;
  const dist = bfsDistanceTransform(data, width, height);

  // ── Pass 1: base puffs ─────────────────────────────────────────────────────

  const bottomEdge = new Int16Array(width).fill(-1);
  for (let col = 0; col < width; col++) {
    for (let row = height - 1; row >= 0; row--) {
      if (data[(row * width + col) * 4 + 3] >= 128) { bottomEdge[col] = row; break; }
    }
  }

  let maxBottomY = 0;
  for (let x = 0; x < width; x++) {
    if (bottomEdge[x] > maxBottomY) maxBottomY = bottomEdge[x];
  }
  if (maxBottomY === 0) return { ellipses: [], baseCount: 0 };

  const isHoriz = new Uint8Array(width);
  for (let x = 0; x < width; x++) {
    if (bottomEdge[x] >= 0 && bottomEdge[x] >= maxBottomY - HORIZ_TOLERANCE) {
      isHoriz[x] = 1;
    }
  }

  const basePuffs: Ellipse[] = [];
  const inBaseZone = new Uint8Array(width);

  let col = 0;
  while (col < width) {
    if (!isHoriz[col]) { col++; continue; }
    const segStart = col;
    let segDeepY = 0;
    while (col < width && isHoriz[col]) {
      if (bottomEdge[col] > segDeepY) segDeepY = bottomEdge[col];
      col++;
    }
    const segEnd = col - 1;
    if (segEnd - segStart + 1 < MIN_BASE_SEGMENT) continue;

    const segY = segDeepY;
    const cxInt = Math.round((segStart + segEnd) / 2);
    let topY = -1;
    for (let row = 0; row < height; row++) {
      if (data[(row * width + cxInt) * 4 + 3] >= 128) { topY = row; break; }
    }
    const shapeHeight = topY >= 0 ? segY - topY : 0;
    const ry = Math.min(Math.round(shapeHeight * BASE_HEIGHT_FRAC), MAX_BASE_RY);
    if (ry < 6) continue;

    basePuffs.push({ cx: cxInt, cy: segY - ry, rx: (segEnd - segStart) / 2 + BASE_OVERHANG, ry });
    for (let x = segStart; x <= segEnd; x++) inBaseZone[x] = 1;
  }

  // ── Pass 2: interior puffs — main grid ────────────────────────────────────

  const interiorPuffs: Ellipse[] = [];
  const startX = Math.floor(GRID_STEP / 2);
  const startY = Math.floor(GRID_STEP / 2);

  for (let gy = startY; gy < height; gy += GRID_STEP) {
    for (let gx = startX; gx < width; gx += GRID_STEP) {
      const i = gy * width + gx;
      if (data[i * 4 + 3] < 128) continue;
      const r = Math.min(dist[i], MAX_RADIUS);
      if (r < MIN_DIST) continue;
      if (inBaseZone[gx] && bottomEdge[gx] >= 0 && gy >= bottomEdge[gx] - MAX_BASE_RY) continue;
      if (r >= THICK_THRESHOLD) {
        let tooClose = false;
        for (const p of interiorPuffs) {
          const dx = gx - p.cx;
          const dy = gy - p.cy;
          const sep = Math.max(p.rx, r) * THICK_MIN_SEP;
          if (dx * dx + dy * dy < sep * sep) { tooClose = true; break; }
        }
        if (tooClose) continue;
      }
      interiorPuffs.push({ cx: gx, cy: gy + r * INTERIOR_Y_SHIFT, rx: r, ry: r });
    }
  }

  // ── Pass 3: fine grid for thin/small features ──────────────────────────────
  // Catches isolated brush dots (radius ~20px) that contain no main-grid point.

  const fineStartX = Math.floor(FINE_STEP / 2);
  const fineStartY = Math.floor(FINE_STEP / 2);

  for (let gy = fineStartY; gy < height; gy += FINE_STEP) {
    for (let gx = fineStartX; gx < width; gx += FINE_STEP) {
      const i = gy * width + gx;
      if (data[i * 4 + 3] < 128) continue;
      const r = Math.min(dist[i], MAX_RADIUS);
      if (r < MIN_DIST || r >= FINE_MAX_DIST) continue;
      if (inBaseZone[gx] && bottomEdge[gx] >= 0 && gy >= bottomEdge[gx] - MAX_BASE_RY) continue;

      // Skip if already covered by a main-grid (or earlier fine) puff.
      let covered = false;
      for (const p of interiorPuffs) {
        const dx = gx - p.cx;
        const dy = gy - p.cy;
        const cover = Math.max(p.rx, r) * FINE_COVER_MULT;
        if (dx * dx + dy * dy < cover * cover) { covered = true; break; }
      }
      if (covered) continue;

      interiorPuffs.push({ cx: gx, cy: gy + r * INTERIOR_Y_SHIFT, rx: r, ry: r });
    }
  }

  // Sort by cx so left puffs render first (behind right puffs) in SVG order.
  interiorPuffs.sort((a, b) => a.cx - b.cx);

  return { ellipses: [...basePuffs, ...interiorPuffs], baseCount: basePuffs.length };
}
