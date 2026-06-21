interface SliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  display?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}

export function Slider({
  label,
  min,
  max,
  step,
  value,
  display,
  disabled,
  onChange,
}: SliderProps) {
  return (
    <div className="grid grid-cols-[96px_1fr_50px] items-center gap-[10px] my-[9px]">
      <label className="text-xs text-ink">{label}</label>
      <input
        type="range"
        className="w-full h-[18px] accent-accent disabled:opacity-40"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      <span className="font-mono text-[11px] text-ink-dim text-right">{display ?? String(value)}</span>
    </div>
  );
}
