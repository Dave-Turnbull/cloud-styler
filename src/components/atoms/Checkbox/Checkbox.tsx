interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Checkbox({ label, checked, onChange }: CheckboxProps) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-[10px] my-1.5">
      <label className="text-xs">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />{' '}
        {label}
      </label>
    </div>
  );
}
