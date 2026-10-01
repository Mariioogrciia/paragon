import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Star, TrendingUp } from "lucide-react";
import { coverGradient } from "@/lib/design";

/**
 * Descubrir como lista de éxitos (rediseño del 1 oct 2026): los mismos
 * datos que las filas de carátulas de antes (tendencias, novedades, joyas),
 * puestos en listas numeradas donde el número es el protagonista. Las cifras
 * son las reales de la base: no hay "subidas" ni "bajadas" porque no se
 * guarda el puesto de la semana anterior, así que no se inventan.
 */

type Juego = { igdbId: number; title: string; iconUrl?: string; genres: string[] };

function Caratula({ juego, ancho, alto }: { juego: Juego; ancho: number; alto: number }) {
  return (
    <span
      className="exitos-caratula"
      style={{ width: ancho, height: alto, background: juego.iconUrl ? undefined : coverGradient(String(juego.igdbId)) }}
    >
      {juego.iconUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={juego.iconUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
      )}
    </span>
  );
}

const puesto = (i: number) => String(i + 1).padStart(2, "0");

/** Tendencias: lo que más cazadores han empezado en 30 días, con su cifra. */
export async function TopComunidad({ items }: { items: (Juego & { recientes: number })[] }) {
  const t = await getTranslations("Descubrir.DescubrirPage");
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="exitos-top">
      <div className="mb-5">
        <h2 id="exitos-top" className="font-heading text-[clamp(1.5rem,4vw,2.25rem)] font-bold uppercase leading-tight">
          {t("top")}
        </h2>
        <p className="mt-1.5 text-sm text-muted">{t("topDesc")}</p>
      </div>
      <ol className="exitos-top" style={{ "--filas": Math.ceil(items.length / 2) } as React.CSSProperties}>
        {items.map((g, i) => (
          <li key={g.igdbId}>
            <Link href={`/juego/${g.igdbId}`} className="exitos-fila group rounded-xl" data-podio={i < 3 ? i + 1 : undefined}>
              <span className="exitos-numeral" aria-label={`#${i + 1}`}>
                {puesto(i)}
              </span>
              <Caratula juego={g} ancho={52} alto={70} />
              <span className="min-w-0">
                <span className="block truncate text-[0.9375rem] font-semibold transition-colors group-hover:text-[var(--accent-text)]">{g.title}</span>
                {g.genres.length > 0 && <span className="mt-0.5 block truncate text-xs text-muted">{g.genres.slice(0, 2).join(" · ")}</span>}
                <span className="mt-1.5 flex items-center gap-1 text-xs font-bold text-[var(--accent-text)]">
                  <TrendingUp size={13} aria-hidden="true" />
                  {t("cazadoresNuevos", { n: g.recientes })}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Novedades: recién salidos o por salir, en el orden de expectación de IGDB. */
export async function NuevasEntradas({ items }: { items: (Juego & { etiqueta: string })[] }) {
  const t = await getTranslations("Descubrir.DescubrirPage");
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="exitos-nuevas">
      <div className="mb-5">
        <h2 id="exitos-nuevas" className="font-heading text-2xl font-bold uppercase">
          {t("nuevasEntradas")}
        </h2>
        <p className="mt-1.5 text-sm text-muted">{t("nuevasEntradasDesc")}</p>
      </div>
      <ol className="exitos-nuevas">
        {items.map((g, i) => (
          <li key={g.igdbId}>
            <Link href={`/juego/${g.igdbId}`} className="exitos-entrada group rounded-xl">
              <span className="exitos-numeral exitos-numeral-chico">{puesto(i)}</span>
              <Caratula juego={g} ancho={40} alto={54} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold transition-colors group-hover:text-[var(--accent-text)]">{g.title}</span>
                <span className="mt-1 inline-block rounded-md px-1.5 py-0.5 text-[0.6875rem] font-bold text-[var(--accent-text)]" style={{ background: "var(--accent-soft)" }}>
                  {g.etiqueta}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Joyas ocultas: nota altísima y pocos dueños, con la nota como cifra grande. */
export async function JoyasConNota({ items }: { items: (Juego & { notaMedia: number; votos: number })[] }) {
  const t = await getTranslations("Descubrir.DescubrirPage");
  const locale = await getLocale();
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="exitos-joyas">
      <div className="mb-5">
        <h2 id="exitos-joyas" className="font-heading text-2xl font-bold uppercase">
          {t("joyasOcultas")}
        </h2>
        <p className="mt-1.5 text-sm text-muted">{t("joyasOcultasDescripcion")}</p>
      </div>
      <ol className="exitos-joyas">
        {items.map((g) => (
          <li key={g.igdbId}>
            <Link href={`/juego/${g.igdbId}`} className="exitos-entrada group rounded-xl">
              <Caratula juego={g} ancho={40} alto={54} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold transition-colors group-hover:text-[var(--accent-text)]">{g.title}</span>
                <span className="mt-0.5 block text-xs text-muted">{t("votos", { n: g.votos })}</span>
              </span>
              <span className="exitos-nota" title={t("joyasNota")}>
                <Star size={14} className="fill-current" aria-hidden="true" />
                {Number(g.notaMedia).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
