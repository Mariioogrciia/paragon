import { getPsNews } from "@/lib/psNews";

/**
 * Noticias del blog oficial de PlayStation (PS Store, PS Plus...) en el
 * panel. Server Component puro — es contenido de lectura, sin nada que
 * interactuar, así que no hace falta cargarlo como cliente.
 */
export async function PsNewsFeed() {
  const noticias = await getPsNews();
  if (noticias.length === 0) return null;

  return (
    <section className="rounded-[18px] border border-border bg-surface p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-heading text-lg font-bold uppercase tracking-wide">Noticias de PlayStation</h2>
        <span className="rounded-md bg-accent/10 px-2 py-1 text-xs font-semibold uppercase text-accent">
          PS Store · PS Plus
        </span>
      </div>

      <div className="flex flex-col divide-y divide-border">
        {noticias.map((item) => (
          <a
            key={item.link}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="group flex flex-col gap-1 rounded-lg px-2 py-3 -mx-2 transition-colors hover:bg-surface-2 first:pt-3 last:pb-3"
          >
            <p className="text-sm font-semibold leading-snug group-hover:text-accent">{item.title}</p>
            {item.resumen && <p className="text-xs text-muted">{item.resumen}</p>}
          </a>
        ))}
      </div>
    </section>
  );
}
