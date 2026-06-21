import type { Ellipse } from './puffs';

export const CANVAS_W = 680;
export const CANVAS_H = 340;
export const MAX_UNDO = 20;

// Grid step between sampled master circles (canvas pixels).
// Smaller = finer coverage of thin strokes but more master circles → heavier SVG.
// At 20px step, a 680×340 canvas with 30% painted coverage yields ~175 circles.
const GRID_STEP = 20;

// Maximum circle radius placed at any grid point (caps very thick regions).
const MAX_RADIUS = 64;

// Minimum distance-transform value required to place a circle.
// Filters out edge-only pixels that have nearly zero interior depth.
const MIN_DIST = 2;

/**
 * BFS distance transform.
 * For each painted (alpha >= 128) pixel, computes the L∞ distance to the
 * nearest unpainted pixel or canvas boundary. Boundary pixels get distance 1;
 * interior pixels propagate outward. Returns a Uint16Array of distances.
 */
function bfsDistanceTransform(
  data: Uint8ClampedArray,
  w: number,
  h: number,
): Uint16Array {
  const dist = new Uint16Array(w * h).fill(65535);
  const queue: number[] = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (data[i * 4 + 3] < 128) continue;

      const onEdge = x === 0 || x === w - 1 || y === 0 || y === h - 1;
      const adjEmpty =
        (x > 0 && data[(i - 1) * 4 + 3] < 128) ||
        (x < w - 1 && data[(i + 1) * 4 + 3] < 128) ||
        (y > 0 && data[(i - w) * 4 + 3] < 128) ||
        (y < h - 1 && data[(i + w) * 4 + 3] < 128);

      if (onEdge || adjEmpty) {
        dist[i] = 1;
        queue.push(i);
      }
    }
  }

  let head = 0;
  while (head < queue.length) {
    const i = queue[head++];
    const d = dist[i];
    const x = i % w;
    const y = (i / w) | 0;

    if (x > 0 && data[(i - 1) * 4 + 3] >= 128 && dist[i - 1] > d + 1) {
      dist[i - 1] = d + 1;
      queue.push(i - 1);
    }
    if (x < w - 1 && data[(i + 1) * 4 + 3] >= 128 && dist[i + 1] > d + 1) {
      dist[i + 1] = d + 1;
      queue.push(i + 1);
    }
    if (y > 0 && data[(i - w) * 4 + 3] >= 128 && dist[i - w] > d + 1) {
      dist[i - w] = d + 1;
      queue.push(i - w);
    }
    if (y < h - 1 && data[(i + w) * 4 + 3] >= 128 && dist[i + w] > d + 1) {
      dist[i + w] = d + 1;
      queue.push(i + w);
    }
  }

  return dist;
}

/**
 * Convert a painted canvas (ImageData from a CANVAS_W × CANVAS_H offscreen
 * canvas) into a master ellipse array suitable for buildPuffs.
 *
 * Algorithm:
 *  1. Compute BFS distance transform over painted pixels.
 *  2. Sample on a regular GRID_STEP grid.
 *  3. At each painted grid point, place a circle whose radius equals the
 *     local distance-transform value (capped at MAX_RADIUS). This naturally
 *     produces small circles in thin strokes and large ones in thick fills,
 *     so no single puff blankets an intricate shape.
 */
export function shapeToMaster(imageData: ImageData): Ellipse[] {
  const { data, width, height } = imageData;
  const dist = bfsDistanceTransform(data, width, height);
  const masters: Ellipse[] = [];

  const startX = Math.floor(GRID_STEP / 2);
  const startY = Math.floor(GRID_STEP / 2);

  for (let y = startY; y < height; y += GRID_STEP) {
    for (let x = startX; x < width; x += GRID_STEP) {
      const i = y * width + x;
      if (data[i * 4 + 3] < 128) continue;
      const r = Math.min(dist[i], MAX_RADIUS);
      if (r < MIN_DIST) continue;
      masters.push({ cx: x, cy: y, rx: r, ry: r });
    }
  }

  return masters;
}
