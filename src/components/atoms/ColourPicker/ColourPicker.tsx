interface ColourPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function ColourPicker({ label, value, onChange }: ColourPickerProps) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-[10px] my-1.5">
      <label className="text-xs">{label}</label>
      <input
        type="color"
        className="w-10 h-[26px] border border-line rounded-md bg-transparent p-0 cursor-pointer"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
