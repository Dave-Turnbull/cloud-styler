import { useMemo, useRef, useState } from 'react';
import type { CloudSettings } from '../utils/types';
import { DEFAULTS } from '../utils/defaults';
import { buildPuffs } from '../utils/puffs';
import { Cloud } from '../components/molecules/Cloud/Cloud';
import { ControlPanel } from '../components/molecules/ControlPanel/ControlPanel';

export function CloudStylerPage() {
  const [settings, setSettings] = useState<CloudSettings>(DEFAULTS);
  const [note, setNote] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);

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

  const puffs = useMemo(
    () => buildPuffs(settings.dens, settings.grid),
    [settings.dens, settings.grid],
  );

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
      const RES = 2; // 2× for retina-quality output

      // Clone and strip CSS transform — we'll apply it on the canvas instead
      // so the output dimensions can accommodate rotation without clipping.
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

      // Expand canvas to fit rotated content without clipping
      const { scale, rotate, flipX, flipY, opacity } = settings;
      const rad = (rotate * Math.PI) / 180;
      const cosA = Math.abs(Math.cos(rad));
      const sinA = Math.abs(Math.sin(rad));
      const absScale = Math.abs(scale);
      const canvasW = Math.round((svgW * cosA + svgH * sinA) * absScale);
      const canvasH = Math.round((svgW * sinA + svgH * cosA) * absScale);

      const canvas = document.createElement('canvas');
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d')!;

      // Transparent background — no fillRect
      ctx.globalAlpha = opacity;
      ctx.translate(canvasW / 2, canvasH / 2);
      ctx.rotate(rad);
      ctx.scale(flipX ? -absScale : absScale, flipY ? -absScale : absScale);
      ctx.drawImage(img, -svgW / 2, -svgH / 2, svgW, svgH);

      const exportBlob = await new Promise<Blob | null>((res) =>
        canvas.toBlob(res, `image/${format}`, 0.95),
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

  function handleReset() {
    setSettings(DEFAULTS);
    setNote('');
  }

  return (
    <div className="flex min-h-screen max-[880px]:flex-col">
      <div className="stage flex-1 min-h-[46vh] flex items-center justify-center p-6 bg-[radial-gradient(120%_90%_at_50%_0%,#cfe2f1_0%,#dceaf4_55%,#e9f1f8_100%)]">
        <Cloud ref={svgRef} settings={settings} puffs={puffs} />
      </div>
      <ControlPanel
        settings={settings}
        update={update}
        onCopy={handleCopy}
        onExport={handleExport}
        onReset={handleReset}
        note={note}
      />
    </div>
  );
}
