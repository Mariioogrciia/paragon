import { useLocale } from "next-intl";
import Link from "next/link";
import type { Vitrina } from "@/lib/vitrinas";

/** Vitrinas temáticas en el perfil — ver lib/vitrinas.ts. Sin vitrinas (o vacías), no pinta nada. */
export function VitrinasPerfil({ vitrinas, handle }: { vitrinas: Vitrina[]; handle: string }) {
  const locale = useLocale();
  const conItems = vitrinas.filter((v) => v.items.length > 0);
  if (conItems.length === 0) return null;

  return (
    <div className="space-y-6">
      {conItems.map((v) => (
        <section key={v.id}>
          <h2 className="mb-3 font-heading text-xl font-bold uppercase tracking-wide text-muted">{v.titulo}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {v.items.map((item) => (
              <Link
                key={item.id}
                href={`/u/${handle}/${item.gameId}`}
                className="group overflow-hidden rounded-xl border border-border bg-surface transition-all hover:-translate-y-1 hover:border-accent"
              >
                <div className="aspect-square overflow-hidden bg-surface-2">
                  {item.iconUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.iconUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  )}
                </div>
                <div className="p-2">
                  <p className="truncate text-xs font-bold">{item.titulo}</p>
                  <p className="truncate text-[0.6875rem] text-muted">
                    {item.rareza !== null ? `${item.rareza.toLocaleString(locale, { maximumFractionDigits: 1 })}% · ${item.subtitulo}` : item.subtitulo}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
