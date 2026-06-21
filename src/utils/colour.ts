export function hexToRgb(h: string): [number, number, number] {
  h = h.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const f = (v: number) =>
    ('0' + Math.round(Math.max(0, Math.min(255, v))).toString(16)).slice(-2);
  return '#' + f(r) + f(g) + f(b);
}

/** Mix a hex colour toward white. t=1 keeps the colour, t=0 returns white. */
export function mixWhite(hex: string, t: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(255 + (r - 255) * t, 255 + (g - 255) * t, 255 + (b - 255) * t);
}

/** Gradient stops: render offset + the white-mix factor applied to the picked colour. */
export const GRADIENT_STOPS: { offset: number; t: number }[] = [
  { offset: 0, t: 0.05 },
  { offset: 0.5, t: 0.30 },
  { offset: 0.8, t: 0.62 },
  { offset: 1, t: 1.0 },
];
