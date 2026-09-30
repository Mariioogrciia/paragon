import { AchievementIcon } from "@/components/AchievementIcon";
import { getTranslations } from "next-intl/server";
import { LOGROS, logroConseguido, type MedidasLogros } from "@/lib/logros";

/**
 * Todas las insignias del catálogo (lib/logros.ts) con su progreso real.
 * `medidas` sale de `medirLogros`, lo mismo que decide qué se otorga, así que
 * la tarjeta y la insignia otorgada no pueden contradecirse. `earnedIds` es la
 * red de seguridad: lo ya otorgado sigue "Conseguido" aunque un umbral cambie.
 */
export async function ParagonAchievements({ medidas, earnedIds }: { medidas: MedidasLogros; earnedIds: string[] }) {
  const t = await getTranslations("Perfil");
  const evaluados = LOGROS.map((logro) => ({
    logro,
    valor: medidas[logro.metrica],
    conseguido: earnedIds.includes(logro.id) || logroConseguido(logro, medidas),
  }))
    // Conseguidos primero; los ocultos sin conseguir, al final.
    .sort((a, b) => Number(b.conseguido) - Number(a.conseguido) || Number(Boolean(a.logro.oculto)) - Number(Boolean(b.logro.oculto)));
  const totalConseguidos = evaluados.filter((e) => e.conseguido).length;

  return (
    <section className="rounded-[18px] border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-heading text-xl font-bold uppercase tracking-wide">{t("ParagonAchievements.heading")}</h2>
          <p className="mt-1 text-sm text-muted">{t("ParagonAchievements.subheading")}</p>
        </div>
        <span className="text-xs font-semibold text-muted">{t("ParagonAchievements.countLabel", { done: totalConseguidos, total: LOGROS.length })}</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {evaluados.map(({ logro, valor, conseguido }) => {
          const secreto = logro.oculto && !conseguido;
          const percent = Math.min(100, Math.round((valor / logro.objetivo) * 100));
          return (
            <div key={logro.id} className="rounded-xl border border-border p-3" style={{ opacity: conseguido ? 1 : 0.62 }}>
              <div className="flex items-start gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: `color-mix(in srgb, ${logro.color} 18%, transparent)`, color: secreto ? "var(--muted)" : logro.color }}
                >
                  <AchievementIcon id={secreto ? "oculto" : logro.id} size={19} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold">{secreto ? t("ParagonAchievements.hiddenName") : t(`Badges.items.${logro.id}.name`)}</h3>
                    {!secreto && (
                      <span className="shrink-0 text-[0.625rem] font-bold uppercase" style={{ color: conseguido ? "var(--good)" : "var(--muted)" }}>
                        {conseguido
                          ? t("ParagonAchievements.earned")
                          : t("ParagonAchievements.progressFraction", { value: Math.min(valor, logro.objetivo), target: logro.objetivo })}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {secreto ? t("ParagonAchievements.hiddenDescription") : t(`Badges.items.${logro.id}.description`)}
                  </p>
                </div>
              </div>
              {!conseguido && !secreto && (
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full" style={{ width: `${percent}%`, background: logro.color }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
