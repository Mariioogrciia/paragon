/* eslint-disable @next/next/no-img-element */
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { Avatar } from "@/components/Avatar";
import { coverGradient, monogram } from "@/lib/design";
import {
  getLibrary,
  getProfileByHandle,
  getProfileByUserId,
} from "@/lib/profiles";
import { sharedGames, summarise } from "@/lib/stats";
import { paragonProgress } from "@/lib/level";
import { sharedTrophyLeads } from "@/lib/comparison";
import { FiltroJuegosComunes } from "@/components/FiltroJuegosComunes";

const OUTCOME = {
  ganas: { label: "Ganas", bg: "rgba(78, 201, 138, 0.12)", fg: "#4ec98a", border: "rgba(78, 201, 138, 0.3)" },
  pierdes: { label: "Pierdes", bg: "rgba(255, 107, 107, 0.12)", fg: "#ff8f8f", border: "rgba(255, 107, 107, 0.28)" },
  empate: { label: "Empate", bg: "rgba(135, 148, 168, 0.12)", fg: "var(--muted)", border: "rgba(135, 148, 168, 0.25)" },
};

function outcome(a: number, b: number): keyof typeof OUTCOME {
  if (a === b) return "empate";
  return a > b ? "ganas" : "pierdes";
}

function OutcomeTag({ kind }: { kind: keyof typeof OUTCOME }) {
  const o = OUTCOME[kind];
  return (
    <span
      className="justify-self-end rounded-full px-[11px] py-1.5 text-[11px] font-bold uppercase tracking-[0.06em]"
      style={{ background: o.bg, color: o.fg, border: `1px solid ${o.border}` }}
    >
      {o.label}
    </span>
  );
}

export default async function CompararPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;

  const session = await auth();
  if (!session?.user) redirect("/entrar");

  const [mio, suyo] = await Promise.all([
    getProfileByUserId(session.user.id),
    getProfileByHandle(handle),
  ]);

  if (!suyo) notFound();
  if (!mio || mio.accounts.length === 0) redirect("/bienvenida");

  if (suyo.accounts.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted">
        @{handle} todavía no ha vinculado ninguna cuenta de juego, así que no hay
        nada que comparar.
      </p>
    );
  }

  const [libA, libB] = await Promise.all([getLibrary(mio), getLibrary(suyo)]);
  const statsA = summarise(libA.games);
  const statsB = summarise(libB.games);
  const comunes = sharedGames([libA, libB]);
  const nivelA = paragonProgress(libA.games);
  const nivelB = paragonProgress(libB.games);
  const lideres = await sharedTrophyLeads(
    mio.userId,
    suyo.userId,
    comunes.map((game) => game.id),
  );
  const ganados = comunes.filter((g) => g.progress[0].percent >= g.progress[1].percent).length;

  const platinoDif = statsA.platinos - statsB.platinos;
  const tagA =
    platinoDif === 0
      ? { ...OUTCOME.empate, label: "Empate" }
      : platinoDif > 0
        ? { ...OUTCOME.ganas, label: "Vas ganando" }
        : { ...OUTCOME.empate, label: `A ${-platinoDif} platinos` };
  const tagB =
    platinoDif === 0
      ? { ...OUTCOME.empate, label: "Empate" }
      : platinoDif > 0
        ? { ...OUTCOME.empate, label: `A ${platinoDif} platinos` }
        : { ...OUTCOME.ganas, label: "Va ganando" };

  const jugadores = [
    { player: libA.player, stats: statsA, tag: tagA, leader: platinoDif >= 0 },
    { player: libB.player, stats: statsB, tag: tagB, leader: platinoDif <= 0 },
  ];

  return (
    <div>
      <h1 className="font-heading text-4xl font-bold uppercase leading-none tracking-[-0.01em] sm:text-[50px]">
        {libA.player.name} <span className="text-accent">vs</span> {libB.player.name}
      </h1>
      <p className="mt-3 max-w-[620px] text-[15px] leading-relaxed text-muted">
        Solo los juegos que tenéis los dos: comparar bibliotecas enteras no
        dice nada si uno lleva jugando el doble de años.
      </p>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        {jugadores.map(({ player, stats, tag, leader }) => (
          <div
            key={player.id}
            className="rounded-[20px] p-6"
            style={
              leader
                ? { border: "1px solid #2f5a8f", background: "linear-gradient(165deg, #14243a, #0d131c)" }
                : { border: "1px solid var(--border)", background: "var(--surface)" }
            }
          >
            <div className="flex items-center gap-3.5">
              <Avatar src={player.avatarUrl} name={player.name} size={48} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[17px] font-semibold">{player.name}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {player.trophyLevel !== undefined
                    ? `Nivel ${player.trophyLevel}`
                    : player.accounts.map((a) => a.username).join(" · ")}
                </p>
              </div>
              <span
                className="ml-auto shrink-0 rounded-full px-[11px] py-1.5 text-[11px] font-bold uppercase tracking-[0.06em]"
                style={{ background: tag.bg, color: tag.fg, border: `1px solid ${tag.border}` }}
              >
                {tag.label}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3.5">
              <div>
                <p className="font-heading text-4xl font-bold leading-none text-platinum">{stats.platinos}</p>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">Platinos</p>
              </div>
              <div>
                <p className="font-heading text-4xl font-bold leading-none">{stats.trofeos.toLocaleString("es-ES")}</p>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">Trofeos</p>
              </div>
              <div>
                <p className="font-heading text-4xl font-bold leading-none">{stats.completadoMedio}%</p>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">Medio</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="mt-4 grid gap-3 sm:grid-cols-2">
        {[{ name: libA.player.name, level: nivelA, color: "var(--accent-text)" }, { name: libB.player.name, level: nivelB, color: "var(--gold)" }].map((player) => (
          <div key={player.name} className="rounded-[18px] border border-border bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold">Nivel Paragon de {player.name}</h2>
              <span className="font-heading text-2xl font-bold" style={{ color: player.color }}>NV {player.level.level}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full" style={{ width: `${player.level.progreso}%`, background: player.color }} /></div>
            <p className="mt-2 text-xs text-muted">{player.level.xp.toLocaleString("es-ES")} XP · {player.level.restante.toLocaleString("es-ES")} para el nivel {player.level.siguienteNivel}</p>
          </div>
        ))}
      </section>

      <section className="mt-9">
        <div className="mb-4 flex items-baseline gap-3.5">
          <h2 className="font-heading text-2xl font-bold">Juegos en común</h2>
          <span className="text-[13px] text-muted">
            {comunes.length} títulos{comunes.length > 0 && ` · ganas ${ganados} de ${comunes.length}`}
          </span>
        </div>

        <FiltroJuegosComunes juegos={comunes} vacioMensaje="No tenéis ningún juego en común todavía.">
          {(visibles) => (
            <div className="grid gap-2.5">
              {visibles.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-[52px_1fr] items-center gap-4 rounded-2xl p-4 sm:grid-cols-[52px_1fr_1.3fr_96px] sm:gap-5"
                  style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
                >
                  <span
                    className="relative flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-[13px]"
                    style={{ background: coverGradient(row.title) }}
                  >
                    {row.iconUrl ? (
                      <img src={row.iconUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <span className="font-heading text-[15px] font-bold text-white">{monogram(row.title)}</span>
                    )}
                  </span>

                  <p className="col-span-1 truncate text-[15px] font-semibold">{row.title}</p>

                  <div className="col-span-2 grid gap-2 sm:col-span-1">
                    {row.progress.map((p, i) => (
                      <div key={jugadores[i].player.id} className="flex items-center gap-3">
                        <span
                          className="w-[52px] shrink-0 text-[11px] font-bold uppercase tracking-[0.06em]"
                          style={{ color: i === 0 ? "var(--accent-text)" : "var(--muted)" }}
                        >
                          {jugadores[i].player.name}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${p.percent}%`,
                              background: i === 0 ? "var(--accent-grad-h)" : "#4a5668",
                            }}
                          />
                        </div>
                        <span
                          className="w-16 shrink-0 text-right text-xs font-bold"
                          style={i === 1 ? { color: "var(--muted)" } : undefined}
                        >
                          {p.percent}%
                          {row.horas[i] !== undefined && (
                            <span className="ml-1 font-normal text-muted">{row.horas[i]!.toFixed(0)}h</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>

                  <OutcomeTag kind={outcome(row.progress[0].percent, row.progress[1].percent)} />
                </div>
              ))}
            </div>
          )}
        </FiltroJuegosComunes>
      </section>

      {lideres.length > 0 && (
        <section className="mt-9">
          <div className="mb-4 flex flex-wrap items-baseline gap-3.5">
            <h2 className="font-heading text-2xl font-bold">Quién llegó antes</h2>
            <span className="text-[13px] text-muted">Trofeos que ambos tenéis registrados</span>
          </div>
          <div className="grid gap-2">
            {lideres.map((trofeo) => (
              <div key={`${trofeo.gameId}:${trofeo.trophyId}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3">
                <div className="min-w-0"><p className="truncate text-sm font-semibold">{trofeo.trophyName}</p><p className="text-xs text-muted">{trofeo.gameTitle}</p></div>
                <span className="shrink-0 text-xs font-bold text-accent">{trofeo.firstUserId === mio.userId ? libA.player.name : libB.player.name} llegó antes</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
