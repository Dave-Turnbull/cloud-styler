import type { ReactNode } from 'react';
import type { CloudSettings, UpdateSetting } from '../../../utils/types';
import { CardWrapper } from '../../atoms/CardWrapper/CardWrapper';
import { Slider } from '../../atoms/Slider/Slider';
import { ColourPicker } from '../../atoms/ColourPicker/ColourPicker';
import { Checkbox } from '../../atoms/Checkbox/Checkbox';
import { Toolbar } from '../Toolbar/Toolbar';

interface ControlPanelProps {
  settings: CloudSettings;
  update: UpdateSetting;
  onCopy: () => void;
  onExport: (format: 'png' | 'webp') => void;
  onReset: () => void;
  note: string;
}

const f1 = (v: number) => v.toFixed(1);
const f2 = (v: number) => v.toFixed(2);

const SectionHeading = ({ children }: { children: ReactNode }) => (
  <h1 className="text-[14px] tracking-[.14em] uppercase mt-0.5 mb-1 font-semibold">{children}</h1>
);

const Sub = ({ children }: { children: ReactNode }) => (
  <p className="text-ink-dim text-xs mb-[18px] leading-normal">{children}</p>
);

const Hint = ({ children }: { children: ReactNode }) => (
  <p className="text-[11px] text-ink-dim leading-normal mt-2.5">{children}</p>
);

export function ControlPanel({
  settings,
  update,
  onCopy,
  onExport,
  onReset,
  note,
}: ControlPanelProps) {
  return (
    <aside className="w-[360px] max-w-full bg-panel border-l border-line px-5 pt-5 pb-10 overflow-y-auto max-h-screen max-[880px]:w-full max-[880px]:border-l-0 max-[880px]:border-t max-[880px]:max-h-none">
      <SectionHeading>Cloud styler</SectionHeading>
      <Sub>
        All controls are filter parameters on one cloud. Density rescales the
        puff pattern itself — same layout, finer or coarser.
      </Sub>

      <CardWrapper title="Colour">
        <ColourPicker
          label="Cloud colour"
          value={settings.col}
          onChange={(v) => update('col', v)}
        />
        <Hint>
          The picked colour is the shaded rim; the lit core lightens toward
          white automatically.
        </Hint>
      </CardWrapper>

      <CardWrapper title="Transform (whole cloud)">
        <Slider
          label="Scale"
          min={0.2}
          max={2}
          step={0.05}
          value={settings.scale}
          display={`${f2(settings.scale)}×`}
          onChange={(v) => update('scale', v)}
        />
        <Slider
          label="Rotate"
          min={-180}
          max={180}
          step={1}
          value={settings.rotate}
          display={`${settings.rotate}°`}
          onChange={(v) => update('rotate', v)}
        />
        <Slider
          label="Opacity"
          min={0}
          max={1}
          step={0.02}
          value={settings.opacity}
          display={f2(settings.opacity)}
          onChange={(v) => update('opacity', v)}
        />
        <Checkbox
          label="Flip horizontally"
          checked={settings.flipX}
          onChange={(v) => update('flipX', v)}
        />
        <Checkbox
          label="Flip vertically"
          checked={settings.flipY}
          onChange={(v) => update('flipY', v)}
        />
      </CardWrapper>

      <SectionHeading>Puffs</SectionHeading>
      <Sub>
        Edit the individual shapes that make up a cloud.
      </Sub>

      <CardWrapper title="Puff Shape">
        <Slider
          label="Puff density"
          min={0.5}
          max={4}
          step={0.1}
          value={settings.dens}
          display={`${f1(settings.dens)}×`}
          onChange={(v) => update('dens', v)}
        />
        <Slider
          label="Puff count"
          min={1}
          max={6}
          step={1}
          value={settings.grid}
          display={String(settings.grid)}
          disabled={settings.lockGrid}
          onChange={(v) => update('grid', v)}
        />
        <Checkbox
          label="Lock grid to density"
          checked={settings.lockGrid}
          onChange={(v) => update('lockGrid', v)}
        />
        <Slider
          label="Puff fuzziness"
          min={0}
          max={30}
          step={0.2}
          value={settings.fuzzy}
          display={f1(settings.fuzzy)}
          onChange={(v) => update('fuzzy', v)}
        />
        <Slider
          label="Path random"
          min={0}
          max={16}
          step={0.5}
          value={settings.rand}
          display={f1(settings.rand)}
          onChange={(v) => update('rand', v)}
        />
        <Slider
          label="Bg inset"
          min={0}
          max={16}
          step={0.5}
          value={settings.inset}
          display={f1(settings.inset)}
          onChange={(v) => update('inset', v)}
        />
        <Hint>
          Density sets puff size; grid count sets how many puffs each is split
          into. Locked, grid follows density (the original effect). Unlock to
          set them apart. Fuzziness, path random and bg inset are density-1
          values and scale with density.
        </Hint>
      </CardWrapper>

      <CardWrapper title="Puff shadow" swatch="#cdd6e4">
        <Slider
          label="Angle X"
          min={0}
          max={1}
          step={0.01}
          value={settings.angX}
          display={f2(settings.angX)}
          onChange={(v) => update('angX', v)}
        />
        <Slider
          label="Angle Y"
          min={0}
          max={1}
          step={0.01}
          value={settings.angY}
          display={f2(settings.angY)}
          onChange={(v) => update('angY', v)}
        />
        <Slider
          label="Size"
          min={0.3}
          max={3}
          step={0.01}
          value={settings.angR}
          display={f2(settings.angR)}
          onChange={(v) => update('angR', v)}
        />
      </CardWrapper>

      <SectionHeading>Overlay</SectionHeading>
      <Sub>
        Edit the shadow and highlight covering the whole cloud.
      </Sub>

      <CardWrapper title="Overlay shadow (underside)" swatch="#7c89a3">
        <Slider
          label="Position X"
          min={-40}
          max={40}
          step={1}
          value={settings.shX}
          display={String(settings.shX)}
          onChange={(v) => update('shX', v)}
        />
        <Slider
          label="Position Y"
          min={-60}
          max={20}
          step={1}
          value={settings.shY}
          display={String(settings.shY)}
          onChange={(v) => update('shY', v)}
        />
        <Slider
          label="Size"
          min={2}
          max={30}
          step={1}
          value={settings.shSize}
          display={String(settings.shSize)}
          onChange={(v) => update('shSize', v)}
        />
        <Slider
          label="Opacity"
          min={0}
          max={1}
          step={0.02}
          value={settings.shOp}
          display={f2(settings.shOp)}
          onChange={(v) => update('shOp', v)}
        />
        <ColourPicker
          label="Colour"
          value={settings.shCol}
          onChange={(v) => update('shCol', v)}
        />
      </CardWrapper>

      <CardWrapper
        title="Highlight (top light)"
        swatch="#ffffff"
        swatchBorder="1px solid #ffffff40"
      >
        <Slider
          label="Position X"
          min={-40}
          max={40}
          step={1}
          value={settings.hiX}
          display={String(settings.hiX)}
          onChange={(v) => update('hiX', v)}
        />
        <Slider
          label="Position Y"
          min={-20}
          max={60}
          step={1}
          value={settings.hiY}
          display={String(settings.hiY)}
          onChange={(v) => update('hiY', v)}
        />
        <Slider
          label="Size"
          min={2}
          max={30}
          step={1}
          value={settings.hiSize}
          display={String(settings.hiSize)}
          onChange={(v) => update('hiSize', v)}
        />
        <Slider
          label="Opacity"
          min={0}
          max={1}
          step={0.02}
          value={settings.hiOp}
          display={f2(settings.hiOp)}
          onChange={(v) => update('hiOp', v)}
        />
        <ColourPicker
          label="Colour"
          value={settings.hiCol}
          onChange={(v) => update('hiCol', v)}
        />
      </CardWrapper>

      <Toolbar onCopy={onCopy} onExport={onExport} onReset={onReset} note={note} />
    </aside>
  );
}
