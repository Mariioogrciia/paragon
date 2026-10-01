import Link from "next/link";
import { coverGradient } from "@/lib/design";

/**
 * Ranking vertical (más jugados, menos jugadores ahora mismo): el puesto en
 * numeral grande de contorno, como el Top de Descubrir (lista de éxitos,
 * 1 oct 2026), y una barra fina proporcional al valor.
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
    <ol className="exitos-ranking">
      {items.map((item, i) => (
        <li key={item.igdbId}>
          <Link href={`/juego/${item.igdbId}`} className="exitos-fila-ranking fila-lista group rounded-xl" data-podio={i < 3 ? i + 1 : undefined}>
            <span className="exitos-numeral exitos-numeral-medio">{String(i + 1).padStart(2, "0")}</span>
            <span className="exitos-caratula" style={{ width: 44, height: 44, background: coverGradient(String(item.igdbId)) }}>
              {item.iconUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img loading="lazy" decoding="async" src={item.iconUrl} alt="" className="h-full w-full object-cover" />
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold transition-colors group-hover:text-[var(--accent-text)]">{item.title}</span>
              <span className="mt-1.5 block h-1 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                <span className="block h-full rounded-full" style={{ width: `${((value(item) / max) * 100).toFixed(1)}%`, background: "var(--accent-grad-h)" }} />
              </span>
            </span>
            <span className="font-heading shrink-0 text-base font-bold tabular-nums text-[var(--accent-text)]">{valueLabel(item)}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
