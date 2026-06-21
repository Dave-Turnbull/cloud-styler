import type { ReactNode } from 'react';

interface CardWrapperProps {
  title: string;
  swatch?: string;
  swatchBorder?: string;
  children: ReactNode;
}

export function CardWrapper({
  title,
  swatch,
  swatchBorder,
  children,
}: CardWrapperProps) {
  return (
    <fieldset className="min-w-0 border border-line rounded-xl p-[14px] mb-[14px] bg-panel-2">
      <div className="text-[11px] tracking-[.12em] uppercase text-ink-dim mb-2.5 font-semibold flex items-center gap-2">
        {swatch && (
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: swatch, border: swatchBorder }}
          />
        )}
        {title}
      </div>
      {children}
    </fieldset>
  );
}
