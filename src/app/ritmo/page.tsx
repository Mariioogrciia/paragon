/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { StatTile } from "@/components/StatTile";
import { BackButton } from "@/components/BackButton";
import { gradeLabel, TrophyTile } from "@/components/TrophyIcon";
import { colorFor, rarity, relativeDate } from "@/lib/design";
import {
  desgloseDelMes,
  esMesValido,
  trofeosDelMes,
  trofeosPorMes,
  type MesConTrofeos,
} from "@/lib/history";
import { getProfileByUserId } from "@/lib/profiles";

export const metadata = { title: "Tu ritmo · Paragon" };

const MESES_LARGOS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const MESES_CORTOS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

function mesCorto(clave: string): string {
  return MESES_CORTOS[Number(clave.split("-")[1]) - 1] ?? clave.slice(5);
}

function nombreMes(clave: string): string {
  const [anio, mes] = clave.split("-");
  return `${MESES_LARGOS[Number(mes) - 1] ?? mes} de ${anio}`;
}

function mesActual(): string {
  const hoy = new Date();
  return `${hoy.getUTCFullYear()}-${String(hoy.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** La misma gráfica del panel, pero aquí cada barra es un enlace al mes. */
function BarrasNavegables({
  meses,
  seleccionado,
}: {
  meses: MesConTrofeos[];
  seleccionado: string;
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
              aria-label={`${nombreMes(m.mes)}: ${m.total} trofeos`}
              className="group flex h-full flex-1 flex-col justify-end"
            >
              <span
                className="mb-1 text-center text-[10px] font-bold tabular-nums transition-opacity"
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
            className="flex-1 text-center text-[10px]"
            style={{
              color: m.mes === seleccionado ? "var(--accent-text)" : "var(--muted)",
              fontWeight: m.mes === seleccionado ? 700 : 400,
            }}
          >
            {mesCorto(m.mes)}
            {m.mes.endsWith("-01") && (
              <span className="block text-[9px]">{m.mes.slice(0, 4)}</span>
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

  const { mes: pedido } = await searchParams;
  const mes = pedido && esMesValido(pedido) ? pedido : mesActual();

  const [meses, desglose, trofeos, profile] = await Promise.all([
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
  const maxDia = Math.max(...desglose.porDia.map((d) => d.total), 1);

  return (
    <div className="space-y-9">
      <div>
        <BackButton fallbackHref="/" label="Volver al panel" />
        <h1 className="font-heading mt-3 text-[42px] font-bold uppercase leading-none">
          {nombreMes(mes)}
        </h1>
        <p className="mt-2 text-[15px] text-muted">
          {meses.some((m) => m.mes === mes)
            ? "Pincha en cualquier mes para ver su desglose."
            : // Se puede llegar aquí desde "Mejor mes", que puede ser de hace
              // años: sin este aviso, ninguna barra sale marcada y parece un fallo.
              "Este mes queda fuera del último año, así que no aparece marcado abajo. Pincha en cualquier barra para volver a los últimos 12 meses."}
        </p>
      </div>

      <BarrasNavegables meses={meses} seleccionado={mes} />

      {desglose.total === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
          Ningún trofeo con fecha en {nombreMes(mes)}.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile value={desglose.total} label="Trofeos del mes" />
            <StatTile value={diasActivos} label="Días con caza" hint={`de ${desglose.porDia.length}`} />
            <StatTile
              value={mejorDia.total}
              label="Mejor día"
              hint={mejorDia.total > 0 ? `día ${Number(mejorDia.dia.slice(8))}` : undefined}
            />
            <StatTile value={desglose.porJuego.length} label="Juegos tocados" />
          </div>

          {/* Calendario del mes: una columna por día, los vacíos incluidos.
              Es lo que explica de dónde sale la racha. */}
          <section
            className="rounded-[18px] p-6"
            style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
          >
            <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
              Día a día
            </h2>
            <div className="flex h-[90px] items-end gap-[3px]">
              {desglose.porDia.map((d) => (
                <div key={d.dia} className="group relative flex h-full flex-1 flex-col justify-end">
                  <span
                    className="rounded-t-[3px]"
                    style={{
                      height: d.total === 0 ? 2 : `max(3px, ${Math.round((d.total / maxDia) * 100)}%)`,
                      background: d.total === 0 ? "var(--border)" : "var(--accent)",
                    }}
                  />
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-[11px] group-hover:block"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                  >
                    Día {Number(d.dia.slice(8))} · {d.total}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] text-muted">
              <span>1</span>
              <span>{desglose.porDia.length}</span>
            </div>
          </section>

          <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
            <section
              className="rounded-[18px] p-6"
              style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
            >
              <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                Por metal
              </h2>
              <div className="space-y-2.5">
                {desglose.porGrado
                  .slice()
                  .sort((a, b) => b.total - a.total)
                  .map((g) => (
                    <div key={g.grade ?? "sin"} className="flex items-center gap-3">
                      <TrophyTile grade={g.grade ?? undefined} size={28} />
                      <span className="text-[13px] font-semibold">
                        {g.grade ? gradeLabel(g.grade) : "Logro"}
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
              <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                Por juego
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
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                      {j.juego}
                    </span>
                    <span className="font-heading shrink-0 text-[15px] font-bold tabular-nums">
                      {j.total}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <section>
            <div className="mb-4 flex flex-wrap items-baseline gap-3">
              <h2 className="font-heading text-2xl font-bold">Uno por uno</h2>
              <span className="text-[13px] text-muted">
                {trofeos.length} {trofeos.length === 1 ? "trofeo" : "trofeos"}, del más
                reciente al más antiguo
              </span>
            </div>

            <div className="space-y-2">
              {trofeos.map((t) => {
                const r = t.rarityPercent !== null ? rarity(t.rarityPercent) : null;

                return (
                  <div
                    key={`${t.gameId}-${t.trophyId}`}
                    className="flex items-center gap-3.5 rounded-xl p-3.5"
                    style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
                  >
                    <TrophyTile grade={t.grade ?? undefined} size={38} />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold">{t.nombre}</p>
                      <p className="truncate text-[12px] text-muted">
                        {t.juego}
                        {t.detalle && ` · ${t.detalle}`}
                      </p>
                    </div>

                    {r && (
                      <span
                        className="hidden shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] sm:inline-block"
                        style={{ background: r.bg, color: r.fg }}
                      >
                        {t.rarityPercent!.toFixed(1)}%
                      </span>
                    )}

                    <span className="shrink-0 text-right text-[11px] text-muted">
                      día {new Date(t.earnedAt).getUTCDate()}
                      <span className="block">{relativeDate(t.earnedAt)}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
