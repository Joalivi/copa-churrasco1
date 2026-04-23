interface NavBadgeProps {
  balance: number | null;
}

export function NavBadge({ balance }: NavBadgeProps) {
  if (balance === null || balance <= 0) return null;

  return (
    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none shadow-sm">
      {balance}
    </span>
  );
}
