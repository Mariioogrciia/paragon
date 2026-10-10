/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { StatTile } from "@/components/StatTile";
import { BackButton } from "@/components/BackButton";
import { ProfileTabsNav } from "@/components/ProfileTabsNav";
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
import { getProfileByUserId, listFriends } from "@/lib/profiles";
import { CompararCon } from "./CompararCon";
import type { DesgloseMes } from "@/lib/history";

/** Días del mes "YYYY-MM" (28-31). */
function diasDelMes(mes: string): number {
  const [anio, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(anio, m, 0)).getUTCDate();
}

/**
 * Tu mes contra el de un amigo (7 oct 2026): quién ganó, trofeos, días
 * activos y mejor día lado a lado, y el día a día con las dos barras juntas
 * (tú en el acento, tu amigo en oro).
 */
function ComparacionMes({
  mes,
  yo,
  otro,
  nombreOtro,
  t,
}: {
  mes: string;
  yo: DesgloseMes;
  otro: DesgloseMes;
  nombreOtro: string;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const resumen = (d: DesgloseMes) => ({
    total: d.total,
    activos: d.porDia.filter((x) => x.total > 0).length,
    mejor: d.porDia.reduce((a, b) => Math.max(a, b.total), 0),
  });
  const a = resumen(yo);
  const b = resumen(otro);
  const n = diasDelMes(mes);
  const delDia = (d: DesgloseMes) => {
    const m = new Map(d.porDia.map((x) => [Number(x.dia.slice(8)), x.total]));
    return Array.from({ length: n }, (_, i) => m.get(i + 1) ?? 0);
  };
  const mios = delDia(yo);
  const suyos = delDia(otro);
  const maximo = Math.max(1, ...mios, ...suyos);
  const veredicto = a.total === b.total ? t("empate") : a.total > b.total ? t("ganasTu") : t("ganaOtro", { nombre: nombreOtro });

  const fila = (etiqueta: string, x: number, y: number) => {
    const max = Math.max(x, y, 1);
    return (
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex items-center justify-end gap-2">
          <span className={`font-heading text-lg font-bold tabular-nums ${x >= y ? "text-[var(--accent-text)]" : "text-muted"}`}>{x}</span>
          <span className="h-2 rounded-full bg-[var(--accent)]" style={{ width: `${Math.max(4, (x / max) * 100)}px`, opacity: x >= y ? 1 : 0.45 }} />
        </div>
        <span className="w-28 text-center text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-muted">{etiqueta}</span>
        <div className="flex items-center gap-2">
          <span className="h-2 rounded-full" style={{ width: `${Math.max(4, (y / max) * 100)}px`, background: "var(--gold, #e2b53e)", opacity: y >= x ? 1 : 0.45 }} />
          <span className={`font-heading text-lg font-bold tabular-nums ${y >= x ? "text-[#e2b53e]" : "text-muted"}`}>{y}</span>
        </div>
      </div>
    );
  };

  return (
    <section className="rounded-[18px] p-6" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-xl font-bold uppercase">
          {t("tu")} <span className="text-muted">vs</span> {nombreOtro}
        </h2>
        <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-bold">{veredicto}</span>
      </div>
      <div className="space-y-3">
        {fila(t("statTrophiesMonth"), a.total, b.total)}
        {fila(t("statActiveDays"), a.activos, b.activos)}
        {fila(t("statBestDay"), a.mejor, b.mejor)}
      </div>
      <h3 className="mb-3 mt-7 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">{t("diaADia")}</h3>
      <div className="flex h-[120px] items-end gap-[3px] border-b border-border">
        {mios.map((x, i) => (
          <div key={i} className="group relative flex h-full flex-1 items-end justify-center gap-[1px]" title={`${i + 1}: ${x} · ${suyos[i]}`}>
            <span className="w-1/2 rounded-t-[2px] bg-[var(--accent)]" style={{ height: x === 0 ? 0 : `max(2px, ${(x / maximo) * 100}%)` }} />
            <span className="w-1/2 rounded-t-[2px]" style={{ height: suyos[i] === 0 ? 0 : `max(2px, ${(suyos[i] / maximo) * 100}%)`, background: "#e2b53e" }} />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[0.625rem] text-muted">
        <span>1</span>
        <span>{Math.ceil(n / 2)}</span>
        <span>{n}</span>
      </div>
      <div className="mt-3 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--accent)]" />{t("tu")}</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: "#e2b53e" }} />{nombreOtro}</span>
      </div>
    </section>
  );
}

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
  con,
}: {
  meses: MesConTrofeos[];
  seleccionado: string;
  mesesCortos: string[];
  /** Si se está comparando con un amigo, los enlaces a otros meses lo mantienen. */
  con?: string | null;
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
              href={`/ritmo?mes=${m.mes}${con ? `&con=${encodeURIComponent(con)}` : ""}`}
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
  searchParams: Promise<{ mes?: string; con?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/entrar");

  const t = await getTranslations("Analitica.ritmoPage");
  const mesesLargos = t.raw("mesesLargos") as string[];
  const mesesCortos = t.raw("mesesCortos") as string[];

  const { mes: pedido, con: conPedido } = await searchParams;
  const mes = pedido && esMesValido(pedido) ? pedido : mesActual();

  const [meses, desglose, trofeosDelMesCompleto, profile, amigos] = await Promise.all([
    trofeosPorMes(session.user.id, 12),
    desgloseDelMes(session.user.id, mes),
    trofeosDelMes(session.user.id, mes),
    getProfileByUserId(session.user.id),
    listFriends(session.user.id).catch(() => []),
  ]);
  // Comparar con un amigo (?con=<handle>): solo con amigos de verdad.
  const amigo = conPedido ? amigos.find((a) => a.handle?.toLowerCase() === conPedido.toLowerCase()) ?? null : null;
  const desgloseAmigo = amigo ? await desgloseDelMes(amigo.userId, mes) : null;
  const nombreAmigo = amigo ? amigo.displayName || amigo.handle || "?" : "";

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

      {profile?.handle && <ProfileTabsNav handle={profile.handle} esMio />}

      <BarrasNavegables meses={meses} seleccionado={mes} mesesCortos={mesesCortos} t={t} con={amigo?.handle ?? null} />

      {amigos.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">{t("compararCon")}</span>
          <CompararCon
            mes={mes}
            con={amigo?.handle ?? null}
            amigos={amigos.filter((a) => a.handle).map((a) => ({ handle: a.handle!, nombre: a.displayName || a.handle! }))}
          />
        </div>
      )}
      {amigo && desgloseAmigo && <ComparacionMes mes={mes} yo={desglose} otro={desgloseAmigo} nombreOtro={nombreAmigo} t={t} />}

      {desglose.total === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
          {t("noTrophiesInMonth", { mes: nombreMes(mes, mesesLargos, t) })}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
                      {j.iconUrl && <img loading="lazy" decoding="async" src={j.iconUrl} alt="" className="h-full w-full object-cover" />}
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
