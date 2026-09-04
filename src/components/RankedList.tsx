import Link from "next/link";
import { coverGradient } from "@/lib/design";

/**
 * Lista vertical con puesto, miniatura y una barra proporcional al valor —
 * para rankings de verdad (más jugados, menos jugadores ahora mismo), donde
 * el orden es el dato importante y una fila de tarjetas iguales lo diluye.
 */
export function RankedList<T extends { igdbId: number; title: string; iconUrl?: string }>({
  items,
  value,
  valueLabel,
}: {
  items: T[];
  value: (item: T) => number;
  valueLabel: (item: T) => string;
}) {
  if (items.length === 0) return null;
  const max = Math.max(...items.map(value), 1);

  return (
    <div className="overflow-hidden rounded-2xl" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
      {items.map((item, i) => (
        <Link
          key={item.igdbId}
          href={`/juego/${item.igdbId}`}
          className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0 transition-colors hover:bg-surface-2"
        >
          <span className="w-5 shrink-0 text-center font-heading text-sm font-bold text-muted">{i + 1}</span>
          <span
            className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg"
            style={{ background: coverGradient(String(item.igdbId)) }}
          >
            {item.iconUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.iconUrl} alt="" className="absolute inset-0 h-full w-full object-contain" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{item.title}</p>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full" style={{ width: `${(value(item) / max) * 100}%`, background: "var(--accent-grad)" }} />
            </div>
          </div>
          <span className="shrink-0 text-xs font-bold text-muted">{valueLabel(item)}</span>
        </Link>
      ))}
    </div>
  );
}
