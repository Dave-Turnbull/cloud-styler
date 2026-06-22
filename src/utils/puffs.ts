export interface Ellipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

/* Master puff layout at density 1. Defines the default cloud shape. */
export const MASTER: Ellipse[] = [
  { cx: 340, cy: 212, rx: 205, ry: 44 },
  { cx: 168, cy: 196, rx: 46, ry: 40 },
  { cx: 200, cy: 176, rx: 38, ry: 43 },
  { cx: 248, cy: 180, rx: 68, ry: 58 },
  { cx: 252, cy: 148, rx: 40, ry: 45 },
  { cx: 300, cy: 128, rx: 55, ry: 48 },
  { cx: 340, cy: 106, rx: 44, ry: 40 },
  { cx: 340, cy: 162, rx: 86, ry: 76 },
  { cx: 388, cy: 123, rx: 47, ry: 53 },
  { cx: 432, cy: 142, rx: 46, ry: 41 },
  { cx: 440, cy: 176, rx: 66, ry: 74 },
  { cx: 488, cy: 164, rx: 43, ry: 38 },
  { cx: 520, cy: 192, rx: 52, ry: 46 },
];

/* Deterministic PRNG so the pattern is stable across renders. */
function rng(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface PuffField {
  puffs: Ellipse[];
  baseCount: number; // puffs belonging to MASTER[0] (the base/bottom ellipse)
}

/**
 * Build the puff field.
 *   density n         -> puff SIZE (sub-radius = rx / n).
 *   count             -> how many puffs each master is split into (count × count).
 *   customMaster      -> replaces MASTER (used for drawn shapes).
 *   baseMasterCount   -> how many leading masters in customMaster are flat base
 *                        puffs (from shapeToMaster). The resulting puffs from
 *                        those masters are tracked in the returned baseCount so
 *                        CloudStylerPage can apply puffDir only to interior puffs.
 */
export function buildPuffs(
  n: number,
  count: number,
  customMaster?: Ellipse[],
  baseMasterCount?: number,
): PuffField {
  const source = customMaster ?? MASTER;
  if (source.length === 0) return { puffs: [], baseCount: 0 };

  const r = rng(98765);
  const OVL = 1.3;
  const out: Ellipse[] = [];
  let baseCount = 0;

  for (let mi = 0; mi < source.length; mi++) {
    const m = source[mi];
    const before = out.length;

    if (count <= 1) {
      const f = 1 / n;
      out.push({
        cx: m.cx,
        cy: m.cy,
        rx: +(m.rx * f).toFixed(1),
        ry: +(m.ry * f).toFixed(1),
      });
    } else {
      const step = 2 / count;
      const subRx = (m.rx / n) * OVL;
      const subRy = (m.ry / n) * OVL;
      for (let i = 0; i < count; i++) {
        for (let j = 0; j < count; j++) {
          const u = -1 + step * (i + 0.5);
          const v = -1 + step * (j + 0.5);
          if (u * u + v * v > 1.08) continue;
          const jx = (r() - 0.5) * subRx * 0.45;
          const jy = (r() - 0.5) * subRy * 0.45;
          const wr = 0.85 + r() * 0.32;
          const hr = 0.85 + r() * 0.32;
          out.push({
            cx: +(m.cx + u * m.rx + jx).toFixed(1),
            cy: +(m.cy + v * m.ry + jy).toFixed(1),
            rx: +(subRx * wr).toFixed(1),
            ry: +(subRy * hr).toFixed(1),
          });
        }
      }
    }

    // Track which rendered puffs came from base masters.
    const isBase = customMaster
      ? (baseMasterCount !== undefined && mi < baseMasterCount)
      : mi === 0;
    if (isBase) baseCount += out.length - before;
  }

  return { puffs: out, baseCount };
}
