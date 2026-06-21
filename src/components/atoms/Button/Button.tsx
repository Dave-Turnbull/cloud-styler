interface ButtonProps {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}

export function Button({ label, onClick, active, disabled }: ButtonProps) {
  return (
    <button
      className={`text-xs text-ink border border-line rounded-lg px-3 py-[9px] cursor-pointer transition-colors ${
        active
          ? 'bg-[#4a6080] border-[#6a90b0]'
          : 'bg-[#2c394d] hover:bg-[#34455c]'
      } disabled:opacity-40 disabled:cursor-not-allowed`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}
