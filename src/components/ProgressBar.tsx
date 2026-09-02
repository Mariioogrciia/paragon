export function ProgressBar({
  percent,
  color = "var(--accent)",
}: {
  percent: number;
  color?: string;
}) {
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width]"
        style={{ width: `${percent}%`, background: color }}
      />
    </div>
  );
}
