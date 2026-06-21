import { Button } from '../../atoms/Button/Button';

interface ToolbarProps {
  onCopy: () => void;
  onExport: (format: 'png' | 'webp') => void;
  onReset: () => void;
  note: string;
}

export function Toolbar({ onCopy, onExport, onReset, note }: ToolbarProps) {
  return (
    <>
      <div className="flex gap-2 mt-1.5">
        <Button label="Copy SVG" onClick={onCopy} />
        <Button label="PNG" onClick={() => onExport('png')} />
        <Button label="WebP" onClick={() => onExport('webp')} />
        <Button label="Reset" onClick={onReset} />
      </div>
      <p className="text-[11px] text-ink-dim leading-normal mt-2.5">{note}</p>
    </>
  );
}
