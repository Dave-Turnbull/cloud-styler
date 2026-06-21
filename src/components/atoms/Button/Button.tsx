interface ButtonProps {
  label: string;
  onClick: () => void;
}

export function Button({ label, onClick }: ButtonProps) {
  return (
    <button
      className="text-xs text-ink bg-[#2c394d] border border-line rounded-lg px-3 py-[9px] cursor-pointer hover:bg-[#34455c]"
      onClick={onClick}
    >
      {label}
    </button>
  );
}
