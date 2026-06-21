export type DrawMode = 'brush' | 'eraser' | null;

export type UpdateSetting = <K extends keyof CloudSettings>(
  key: K,
  value: CloudSettings[K],
) => void;

export interface CloudSettings {
  /* colour */
  col: string;

  /* shape */
  dens: number;
  grid: number;
  lockGrid: boolean;
  puffDir: boolean;
  fuzzy: number;
  rand: number;
  inset: number;

  /* per-puff gradient (circle shadow) */
  angX: number;
  angY: number;
  angR: number;

  /* overlay shadow (underside) */
  shX: number;
  shY: number;
  shSize: number;
  shOp: number;
  shCol: string;

  /* highlight (top light) */
  hiX: number;
  hiY: number;
  hiSize: number;
  hiOp: number;
  hiCol: string;

  /* whole-cloud transform (applied as CSS to the svg) */
  scale: number;
  rotate: number;
  flipX: boolean;
  flipY: boolean;
  opacity: number;
}
