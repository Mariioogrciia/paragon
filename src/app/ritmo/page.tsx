/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { StatTile } from "@/components/StatTile";
import { BackButton } from "@/components/BackButton";
import { gradeLabel, TrophyTile } from "@/components/TrophyIcon";
import { RitmoTrophyList } from "@/components/RitmoTrophyList";
import { colorFor } from "@/lib/design";
import {
  desgloseDelMes,
  esMesValido,
  trofeosDelMes,
  trofeosPorMes,
  type MesConTrofeos,
} from "@/lib/history";
import { getProfileByUserId } from "@/lib/profiles";

export const metadata = { title: "Tu ritmo · Paragon" };

function mesCorto(clave: string, mesesCortos: string[]): string {
  return mesesCortos[Number(clave.split("-")[1]) - 1] ?? clave.slice(5);
}

function nombreMes(clave: string, mesesLargos: string[], t: (key: string, values: Record<string, string>) => string): string {
  const [anio, mes] = clave.split("-");
  return t("nombreMes", { mes: mesesLargos[Number(mes) - 1] ?? mes, anio });
}

function mesActual(): string {
  const hoy = new Date();
  return `${hoy.getUTCFullYear()}-${String(hoy.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** La misma gráfica del panel, pero aquí cada barra es un enlace al mes. */
function BarrasNavegables({
  meses,
  seleccionado,
  mesesCortos,
  t,
}: {
  meses: MesConTrofeos[];
  seleccionado: string;
  mesesCortos: string[];
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const maximo = Math.max(...meses.map((m) => m.total), 1);

  return (
    <div
      className="rounded-[18px] p-6"
      style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
    >
      <div className="flex h-[130px] items-end gap-1.5 border-b border-border">
        {meses.map((m) => {
          const activo = m.mes === seleccionado;
          return (
            <Link
              key={m.mes}
              href={`/ritmo?mes=${m.mes}`}
              aria-label={t("barAriaLabel", { mes: nombreMes(m.mes, t.raw("mesesLargos"), t), count: m.total })}
              className="group flex h-full flex-1 flex-col justify-end"
            >
              <span
                className="mb-1 text-center text-[0.625rem] font-bold tabular-nums transition-opacity"
                style={{ opacity: activo ? 1 : 0 }}
              >
                {m.total}
              </span>
              <span
                className="rounded-t-[4px] transition-all group-hover:opacity-80"
                style={{
                  height: m.total === 0 ? 2 : `max(3px, ${Math.round((m.total / maximo) * 100)}%)`,
                  background:
                    m.total === 0
                      ? "var(--border)"
                      : activo
                        ? "var(--accent)"
                        : "rgb(var(--accent-rgb) / 0.35)",
                }}
              />
            </Link>
          );
        })}
      </div>

      <div className="mt-2 flex gap-1.5">
        {meses.map((m) => (
          <span
            key={m.mes}
            className="flex-1 text-center text-[0.625rem]"
            style={{
              color: m.mes === seleccionado ? "var(--accent-text)" : "var(--muted)",
              fontWeight: m.mes === seleccionado ? 700 : 400,
            }}
          >
            {mesCorto(m.mes, mesesCortos)}
            {m.mes.endsWith("-01") && (
              <span className="block text-[0.5625rem]">{m.mes.slice(0, 4)}</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

export default async function RitmoPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/entrar");

  const t = await getTranslations("Analitica.ritmoPage");
  const mesesLargos = t.raw("mesesLargos") as string[];
  const mesesCortos = t.raw("mesesCortos") as string[];

  const { mes: pedido } = await searchParams;
  const mes = pedido && esMesValido(pedido) ? pedido : mesActual();

  const [meses, desglose, trofeosDelMesCompleto, profile] = await Promise.all([
    trofeosPorMes(session.user.id, 12),
    desgloseDelMes(session.user.id, mes),
    trofeosDelMes(session.user.id, mes),
    getProfileByUserId(session.user.id),
  ]);

  const diasActivos = desglose.porDia.filter((d) => d.total > 0).length;
  const mejorDia = desglose.porDia.reduce(
    (a, b) => (b.total > a.total ? b : a),
    desglose.porDia[0] ?? { dia: mes, total: 0 },
  );

  return (
    <div className="space-y-9">
      <div>
        <BackButton fallbackHref="/" label={t("backButton")} />
        <h1 className="font-heading mt-3 text-[2.625rem] font-bold uppercase leading-none">
          {nombreMes(mes, mesesLargos, t)}
        </h1>
        <p className="mt-2 text-[0.9375rem] text-muted">
          {meses.some((m) => m.mes === mes)
            ? t("helpCurrentYear")
            : // Se puede llegar aquí desde "Mejor mes", que puede ser de hace
              // años: sin este aviso, ninguna barra sale marcada y parece un fallo.
              t("helpOutOfRange")}
        </p>
      </div>

      <BarrasNavegables meses={meses} seleccionado={mes} mesesCortos={mesesCortos} t={t} />

      {desglose.total === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
          {t("noTrophiesInMonth", { mes: nombreMes(mes, mesesLargos, t) })}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile value={desglose.total} label={t("statTrophiesMonth")} />
            <StatTile value={diasActivos} label={t("statActiveDays")} hint={t("statActiveDaysHint", { total: desglose.porDia.length })} />
            <StatTile
              value={mejorDia.total}
              label={t("statBestDay")}
              hint={mejorDia.total > 0 ? t("statBestDayHint", { dia: Number(mejorDia.dia.slice(8)) }) : undefined}
            />
            <StatTile value={desglose.porJuego.length} label={t("statGamesTouched")} />
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[0.9fr_1.1fr]">
            <section
              className="rounded-[18px] p-6"
              style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
            >
              <h2 className="mb-4 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
                {t("byMetal")}
              </h2>
              <div className="space-y-2.5">
                {desglose.porGrado
                  .slice()
                  .sort((a, b) => b.total - a.total)
                  .map((g) => (
                    <div key={g.grade ?? "sin"} className="flex items-center gap-3">
                      <TrophyTile grade={g.grade ?? undefined} size={28} />
                      <span className="text-[0.8125rem] font-semibold">
                        {g.grade ? gradeLabel(g.grade) : t("achievement")}
                      </span>
                      <span
                        className="ml-auto font-heading text-lg font-bold tabular-nums"
                        style={{ color: colorFor(g.grade ?? undefined) }}
                      >
                        {g.total}
                      </span>
                    </div>
                  ))}
              </div>
            </section>

            <section
              className="rounded-[18px] p-6"
              style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
            >
              <h2 className="mb-4 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
                {t("byGame")}
              </h2>
              <div className="space-y-2">
                {desglose.porJuego.map((j) => (
                  <Link
                    key={j.gameId}
                    href={profile?.handle ? `/u/${profile.handle}/${j.gameId}` : "#"}
                    className="flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-surface-2"
                  >
                    <span className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-surface-2">
                      {j.iconUrl && <img src={j.iconUrl} alt="" className="h-full w-full object-cover" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold">
                      {j.juego}
                    </span>
                    <span className="font-heading shrink-0 text-[0.9375rem] font-bold tabular-nums">
                      {j.total}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <RitmoTrophyList porDia={desglose.porDia} trofeos={trofeosDelMesCompleto} />
        </>
      )}
    </div>
  );
}
