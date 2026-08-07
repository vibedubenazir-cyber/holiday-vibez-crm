const COLORS: Record<string, string> = {
  ONLINE: 'bg-emerald-500',
  BUSY: 'bg-amber-500',
  OFFLINE: 'bg-red-400',
};

export function PresenceDot({ status, className = '' }: { status: string; className?: string }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white dark:ring-slate-800 ${COLORS[status] ?? COLORS.OFFLINE} ${className}`}
      title={status.charAt(0) + status.slice(1).toLowerCase()}
    />
  );
}
