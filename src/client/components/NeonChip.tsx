interface NeonChipProps {
  children: any;
  bg?: string;
  color?: string;
}

export function NeonChip({ children, bg = '#EDE6FF', color = '#3821B0' }: NeonChipProps) {
  return (
    <span className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: bg, color }}>
      {children}
    </span>
  );
}
