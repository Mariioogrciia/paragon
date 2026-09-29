import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Avatar } from "@/components/Avatar";
import { BackButton } from "@/components/BackButton";
import { MEDALLAS, NIVEL_MAXIMO, PUNTOS_POR_NIVEL, faltanParaSiguiente, medallaDe, temporadaDe } from "@/lib/temporada";
import { historialTemporadas, rankingTemporada, type FilaTemporada } from "@/lib/temporadas";

export const metadata = { title: "Temporada · Paragon" };

/**
 * Pase de Temporada — reglas en lib/temporada.ts. Tu nivel y el camino de
 * medallas, el ranking de la temporada y tus temporadas anteriores.
 */
export default async function TemporadaPage() {
  const t = await getTranslations("Shell.Temporada");
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const ahora = new Date();
  const temporada = temporadaDe(ahora);
  const [ranking, historial] = await Promise.all([
    rankingTemporada(temporada).catch((): FilaTemporada[] => []),
    userId ? historialTemporadas(userId).catch(() => []) : Promise.resolve([]),
  ]);

  const yo = userId ? ranking.find((r) => r.userId === userId) : undefined;
  const puntos = yo?.puntos ?? 0;
  const nivel = yo?.nivel ?? 0;
  const puesto = yo ? ranking.indexOf(yo) + 1 : null;
  const diasRestantes = Math.max(0, Math.ceil((temporada.fin.getTime() - ahora.getTime()) / 86_400_000));
  const progresoNivel = nivel >= NIVEL_MAXIMO ? 100 : Math.round(((puntos % PUNTOS_POR_NIVEL) / PUNTOS_POR_NIVEL) * 100);
  const medalla = medallaDe(nivel);

  return (
    <div className="mx-auto max-w-[900px] space-y-8">
      <BackButton fallbackHref="/" />
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-text)]">
          {t("nombre", { trimestre: temporada.trimestre, anio: temporada.anio })}
        </p>
        <h1 className="font-heading text-[2.625rem] font-bold uppercase leading-none">{t("titulo")}</h1>
        <p className="mt-2 max-w-[650px] text-sm text-muted">{t("subtitulo", { dias: diasRestantes })}</p>
      </div>

      {userId && (
        <section className="rounded-[18px] border p-5" style={{ borderColor: "rgb(var(--accent-rgb) / 0.35)", background: "linear-gradient(var(--surface), rgb(var(--accent-rgb) / 0.06))" }}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted">{t("tuNivel")}</p>
              <p className="font-heading text-5xl font-bold tabular-nums">
                {nivel}
                <span className="ml-2 text-2xl">{medalla?.emoji}</span>
              </p>
            </div>
            <div className="text-right text-sm text-muted">
              <p>
                <strong className="text-foreground">{puntos.toLocaleString("es-ES")}</strong> {t("puntos")}
              </p>
              {puesto && <p>{t("puesto", { puesto, total: ranking.length })}</p>}
            </div>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full" style={{ width: `${progresoNivel}%`, background: "var(--accent-grad)" }} />
          </div>
          <p className="mt-1 text-xs text-muted">
            {nivel >= NIVEL_MAXIMO ? t("maximo") : t("siguiente", { faltan: faltanParaSiguiente(puntos), nivel: nivel + 1 })}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {MEDALLAS.map((m) => {
              const conseguida = nivel >= m.nivel;
              return (
                <div
                  key={m.clave}
                  className="rounded-xl border p-3 text-center"
                  style={{ borderColor: conseguida ? m.color : "var(--border)", opacity: conseguida ? 1 : 0.5 }}
                >
                  <p className="text-2xl">{m.emoji}</p>
                  <p className="text-xs font-bold" style={{ color: conseguida ? m.color : undefined }}>
                    {t(`medallas.${m.clave}`)}
                  </p>
                  <p className="text-[0.6875rem] text-muted">{t("nivelN", { n: m.nivel })}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted">{t("reglas", { puntos: PUNTOS_POR_NIVEL })}</p>
        </section>
      )}

      <section>
        <h2 className="mb-3 font-heading text-xl font-bold">{t("ranking")}</h2>
        {ranking.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">{t("vacio")}</p>
        ) : (
          <div className="grid gap-2">
            {ranking.slice(0, 20).map((r, i) => {
              const m = medallaDe(r.nivel);
              return (
                <Link
                  key={r.userId}
                  href={r.handle ? `/u/${r.handle}` : "#"}
                  className="flex items-center gap-3 rounded-xl border bg-surface p-3 transition-colors hover:border-accent"
                  style={{ borderColor: r.userId === userId ? "rgb(var(--accent-rgb) / 0.5)" : "var(--border)" }}
                >
                  <span className="w-6 text-center text-sm font-bold text-muted">{i + 1}</span>
                  <Avatar src={r.image} name={r.name ?? r.handle ?? "?"} size={32} />
                  <span className="min-w-0 flex-1 truncate font-semibold">{r.name?.trim().split(/\s+/)[0] || `@${r.handle}`}</span>
                  <span className="text-sm text-muted">
                    {t("nivelN", { n: r.nivel })} {m?.emoji}
                  </span>
                  <span className="w-20 text-right font-mono text-sm font-bold text-[var(--accent-text)]">{r.puntos.toLocaleString("es-ES")}</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {historial.length > 0 && (
        <section>
          <h2 className="mb-3 font-heading text-xl font-bold">{t("anteriores")}</h2>
          <div className="flex flex-wrap gap-2">
            {historial.map((h) => {
              const m = medallaDe(h.nivel);
              return (
                <span key={h.temporada} className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm">
                  {h.temporada.replace("-", " ")} · {t("nivelN", { n: h.nivel })} {m?.emoji}
                </span>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
