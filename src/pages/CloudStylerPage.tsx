import { useMemo, useRef, useState } from 'react';
import type { CloudSettings, DrawMode } from '../utils/types';
import type { Ellipse } from '../utils/puffs';
import { MASTER } from '../utils/puffs';
import { DEFAULTS } from '../utils/defaults';
import { buildPuffs } from '../utils/puffs';
import { shapeToMaster, CANVAS_W, CANVAS_H } from '../utils/shapeToMaster';
import { Cloud } from '../components/molecules/Cloud/Cloud';
import { ControlPanel } from '../components/molecules/ControlPanel/ControlPanel';
import { DrawingCanvas } from '../components/molecules/DrawingCanvas/DrawingCanvas';
import type { DrawingCanvasHandle } from '../components/molecules/DrawingCanvas/DrawingCanvas';

const FIXED_VIEWBOX = `0 0 ${CANVAS_W} ${CANVAS_H}`;

/**
 * Rasterise the default MASTER ellipses onto an offscreen canvas and run
 * shapeToMaster so the initial cloud is drawn the same way as user-drawn shapes.
 * Computed once (lazy useState initialiser).
 */
function computeInitialMaster(): Ellipse[] {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'white';
  for (const m of MASTER) {
    ctx.beginPath();
    ctx.ellipse(m.cx, m.cy, m.rx, m.ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  return shapeToMaster(ctx.getImageData(0, 0, CANVAS_W, CANVAS_H));
}

export function CloudStylerPage() {
  const [settings, setSettings] = useState<CloudSettings>(DEFAULTS);
  const [note, setNote] = useState('');
  const [drawMode, setDrawMode] = useState<DrawMode>(null);
  const [brushSize, setBrushSize] = useState(20);
  // Always drawing-derived — initialised from MASTER so there's no jump on first stroke.
  const [customMaster, setCustomMaster] = useState<Ellipse[]>(computeInitialMaster);
  const svgRef = useRef<SVGSVGElement>(null);
  const drawingRef = useRef<DrawingCanvasHandle>(null);

  function update<K extends keyof CloudSettings>(
    key: K,
    value: CloudSettings[K],
  ) {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'dens' && next.lockGrid) next.grid = Math.ceil(next.dens);
      if (key === 'lockGrid' && value === true) next.grid = Math.ceil(next.dens);
      return next;
    });
  }

  function toggleDrawMode(mode: 'brush' | 'eraser') {
    setDrawMode((prev) => (prev === mode ? null : mode));
  }

  function handleShapeChange(master: Ellipse[]) {
    setCustomMaster(master);
  }

  function handleUndo() {
    drawingRef.current?.undo();
  }

  function handleClearDrawing() {
    drawingRef.current?.clear();
    // onShapeChange([]) fires from inside clear() → setCustomMaster([])
  }

  function handleReset() {
    setSettings(DEFAULTS);
    setDrawMode(null);
    setBrushSize(20);
    setNote('');
    // Re-draw the default shape on the canvas and sync customMaster
    const initial = computeInitialMaster();
    setCustomMaster(initial);
    drawingRef.current?.initialize(MASTER);
  }

  // buildPuffs always uses the drawing-derived master (never the hardcoded MASTER).
  // Only dens, grid, and customMaster affect puff placement — not appearance settings.
  const { puffs: rawPuffs, baseCount } = useMemo(
    () => buildPuffs(settings.dens, settings.grid, customMaster),
    [settings.dens, settings.grid, customMaster],
  );

  const puffs = useMemo(() => {
    const base = rawPuffs.slice(0, baseCount);
    const cloud = rawPuffs.slice(baseCount);
    return settings.puffDir ? [...base, ...[...cloud].reverse()] : rawPuffs;
  }, [rawPuffs, baseCount, settings.puffDir]);

  async function handleCopy() {
    if (!svgRef.current) return;
    try {
      await navigator.clipboard.writeText(svgRef.current.outerHTML);
      setNote('Copied the current SVG (with generated puffs) to your clipboard.');
    } catch {
      setNote('Copy failed — select the SVG in your editor instead.');
    }
  }

  async function handleExport(format: 'png' | 'webp') {
    if (!svgRef.current) return;
    setNote('Exporting…');
    try {
      const svg = svgRef.current;
      const vb = svg.viewBox.baseVal;
      const RES = 2;

      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.style.transform = '';
      clone.style.transformOrigin = '';
      const svgW = Math.round(vb.width * RES);
      const svgH = Math.round(vb.height * RES);
      clone.setAttribute('width', String(svgW));
      clone.setAttribute('height', String(svgH));

      const svgBlob = new Blob(
        [new XMLSerializer().serializeToString(clone)],
        { type: 'image/svg+xml' },
      );
      const svgUrl = URL.createObjectURL(svgBlob);
      const img = new Image();
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error('SVG render failed'));
        img.src = svgUrl;
      });
      URL.revokeObjectURL(svgUrl);

      const { scale, rotate, flipX, flipY, opacity } = settings;
      const rad = (rotate * Math.PI) / 180;
      const cosA = Math.abs(Math.cos(rad));
      const sinA = Math.abs(Math.sin(rad));
      const absScale = Math.abs(scale);
      const canvasW = Math.round((svgW * cosA + svgH * sinA) * absScale);
      const canvasH = Math.round((svgW * sinA + svgH * cosA) * absScale);

      const offscreen = document.createElement('canvas');
      offscreen.width = canvasW;
      offscreen.height = canvasH;
      const ctx = offscreen.getContext('2d')!;

      ctx.globalAlpha = opacity;
      ctx.translate(canvasW / 2, canvasH / 2);
      ctx.rotate(rad);
      ctx.scale(flipX ? -absScale : absScale, flipY ? -absScale : absScale);
      ctx.drawImage(img, -svgW / 2, -svgH / 2, svgW, svgH);

      const exportBlob = await new Promise<Blob | null>((res) =>
        offscreen.toBlob(res, `image/${format}`, 0.95),
      );
      if (!exportBlob) throw new Error('Canvas export failed');

      const a = document.createElement('a');
      a.href = URL.createObjectURL(exportBlob);
      a.download = `cloud.${format}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
      setNote(`Saved cloud.${format}`);
    } catch {
      setNote('Export failed — try Copy SVG instead.');
    }
  }

  return (
    <div className="flex min-h-screen max-[880px]:flex-col">
      <div className="stage flex-1 min-h-[46vh] flex items-center justify-center p-6 bg-[radial-gradient(120%_90%_at_50%_0%,#cfe2f1_0%,#dceaf4_55%,#e9f1f8_100%)] relative overflow-hidden">
        <Cloud
          ref={svgRef}
          settings={settings}
          puffs={puffs}
          fixedViewBox={FIXED_VIEWBOX}
        />
        <DrawingCanvas
          ref={drawingRef}
          mode={drawMode}
          brushSize={brushSize}
          onShapeChange={handleShapeChange}
          initialEllipses={MASTER}
        />
      </div>
      <ControlPanel
        settings={settings}
        update={update}
        drawMode={drawMode}
        onToggleDrawMode={toggleDrawMode}
        brushSize={brushSize}
        onBrushSizeChange={setBrushSize}
        onUndo={handleUndo}
        onClearDrawing={handleClearDrawing}
        hasDrawing={customMaster.length > 0}
        onCopy={handleCopy}
        onExport={handleExport}
        onReset={handleReset}
        note={note}
      />
    </div>
  );
}
