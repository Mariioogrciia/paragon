/**
 * Cifra destacada. No es un gráfico a propósito: un solo número se lee mejor
 * grande y desnudo que dentro de cualquier forma.
 */
export function StatTile({
  value,
  label,
  hint,
  accent,
}: {
  value: string | number;
  label: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-[20px] border border-border bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(255,255,255,0.1)]">
      <p
        className="font-heading text-[40px] font-bold leading-none tabular-nums"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
      <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </div>
  );
}
