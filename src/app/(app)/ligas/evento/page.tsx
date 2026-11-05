import { getLocale, getTranslations } from "next-intl/server";
import Link from "@/components/Enlace";
import { Avatar } from "@/components/Avatar";
import { BackButton } from "@/components/BackButton";
import { SeccionTabs } from "@/components/SeccionTabs";
import { eventoAnterior, eventoDelMes } from "@/lib/eventos";
import { clasificacionEvento } from "@/lib/eventosComunidad";
import { metaPublica } from "@/lib/seo";

export const metadata = metaPublica(
  "/ligas/evento",
  "Evento del mes · Paragon",
  "Cada mes, un género: quién saca más trofeos en juegos de RPG, acción, aventura… entre toda la comunidad de Paragon.",
);

/** Evento mensual de la comunidad (lib/eventos.ts): ranking de este mes y podio del anterior. */
export default async function EventoPage() {
  const t = await getTranslations("Perfil.Evento");
  const locale = await getLocale();
  const ahora = new Date();
  const evento = eventoDelMes(ahora);
  const anterior = eventoAnterior(ahora);
  const [ranking, podio] = await Promise.all([
    clasificacionEvento(evento).catch(() => []),
    clasificacionEvento(anterior, 3).catch(() => []),
  ]);
  const mes = (e: typeof evento) => new Date(e.inicio.getTime() + 86_400_000).toLocaleString(locale, { month: "long", year: "numeric", timeZone: "UTC" });
  const diasRestantes = Math.max(0, Math.ceil((evento.fin.getTime() - ahora.getTime()) / 86_400_000));
  const medallas = ["🥇", "🥈", "🥉"];

  return (
    <div className="mx-auto max-w-[800px] px-7 py-12">
      <BackButton fallbackHref="/ligas" />
      <SeccionTabs seccion="ligas" />

      <div className="mb-8">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted">{t("eyebrow", { mes: mes(evento) })}</p>
        <h1 className="font-heading mb-2 mt-1 text-[clamp(1.75rem,5vw,2.5rem)] font-bold uppercase leading-tight">
          {t("titulo", { genero: t(`genero.${evento.categoria}`) })}
        </h1>
        <p className="text-muted">{t("descripcion", { genero: t(`genero.${evento.categoria}`) })}</p>
        <p className="mt-2 text-sm font-semibold">{t("quedan", { count: diasRestantes })}</p>
      </div>

      {ranking.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">{t("vacio")}</div>
      ) : (
        <ol className="flex flex-col gap-2">
          {ranking.map((p, i) => (
            <li key={p.userId} className="flex items-center gap-3 rounded-[14px] border border-border bg-surface px-4 py-3">
              <span className="w-8 shrink-0 text-center font-heading text-lg font-bold tabular-nums">{medallas[i] ?? i + 1}</span>
              <Avatar src={p.image} name={p.name ?? p.handle ?? "?"} size={36} />
              <span className="min-w-0 flex-1">
                {p.handle ? (
                  <Link href={`/u/${p.handle}`} className="block truncate font-semibold hover:text-[var(--accent-text)]">
                    {p.name ?? `@${p.handle}`}
                  </Link>
                ) : (
                  <span className="block truncate font-semibold">{p.name}</span>
                )}
                <span className="text-xs text-muted">{t("detalle", { trofeos: p.trofeos, platinos: p.platinos })}</span>
              </span>
              <span className="shrink-0 font-heading text-lg font-bold tabular-nums">{p.puntos.toLocaleString(locale)}</span>
            </li>
          ))}
        </ol>
      )}

      {podio.length > 0 && (
        <section className="mt-10">
          <h2 className="font-heading mb-3 text-xl font-bold">{t("anterior", { genero: t(`genero.${anterior.categoria}`), mes: mes(anterior) })}</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            {podio.map((p, i) => (
              <div key={p.userId} className="flex items-center gap-3 rounded-[14px] border border-border bg-surface p-3">
                <span className="text-xl">{medallas[i]}</span>
                <Avatar src={p.image} name={p.name ?? p.handle ?? "?"} size={32} />
                <span className="min-w-0 truncate text-sm font-semibold">{p.name ?? `@${p.handle}`}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      <p className="mt-8 text-xs text-muted">{t("reglas")}</p>
    </div>
  );
}
