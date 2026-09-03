/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { Avatar } from "@/components/Avatar";
import { CollectionPicker } from "@/components/Collections";
import { CommunityRating } from "@/components/CommunityRating";
import { Stars } from "@/components/Stars";
import { gradeLabel, TrophyIcon, TrophyTile } from "@/components/TrophyIcon";
import { ReviewEditor } from "@/components/ReviewEditor";
import { TrophyList } from "@/components/TrophyList";
import { ManualGameStatus } from "@/components/ManualGameStatus";
import { listCollections } from "@/lib/collections";
import { colorFor, coverGradient, rarity, relativeDate } from "@/lib/design";
import { getGameDetail, getProfileByHandle, resolveAvatarUrl } from "@/lib/profiles";
import { getCommunityRating } from "@/lib/ratings";
import { gameProgress, nextSteps, repartoDlc } from "@/lib/stats";
import { dificultadDeJuego } from "@/lib/difficulty";
import { estimarEta } from "@/lib/eta";
import { EtaPlatinoCard } from "@/components/EtaPlatino";
import type { Trophy } from "@/lib/types";
import { Pegi } from "@/components/Pegi";

function ProximoRow({ trophy }: { trophy: Trophy }) {
  const r = trophy.rarityPercent !== undefined ? rarity(trophy.rarityPercent) : null;

  return (
    <div
      className="grid grid-cols-[52px_1fr] items-center gap-4 rounded-2xl p-4 sm:grid-cols-[52px_1fr_190px] sm:gap-[18px]"
      style={{ border: "1px solid var(--border)", background: "linear-gradient(var(--surface), var(--background))" }}
    >
      <TrophyTile grade={trophy.grade} size={52} />

      <div className="min-w-0">
        <p className="text-[15px] font-semibold">{trophy.name}</p>
        {trophy.detail && <p className="mt-1 text-[13px] text-muted">{trophy.detail}</p>}

        {trophy.progress && trophy.progress.current > 0 && (
          <div className="mt-2.5 flex max-w-[300px] items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.round((trophy.progress.current / trophy.progress.target) * 100)}%`,
                  background: "var(--gold)",
                }}
              />
            </div>
            <span className="text-xs font-bold tabular-nums">
              {trophy.progress.current}/{trophy.progress.target}
            </span>
          </div>
        )}
      </div>

      <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:block sm:text-right">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: colorFor(trophy.grade) }}>
          {gradeLabel(trophy.grade)}
        </p>
        {r && (
          <p
            className="mt-1.5 inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em]"
            style={{ background: r.bg, color: r.fg }}
          >
            {r.label} · {trophy.rarityPercent!.toFixed(1)}%
          </p>
        )}
      </div>
    </div>
  );
}

export default async function JuegoPage({
  params,
}: {
  params: Promise<{ handle: string; gameId: string }>;
}) {
  const { handle, gameId } = await params;

  const profile = await getProfileByHandle(handle);
  if (!profile) notFound();

  const game = await getGameDetail(profile, gameId);
  if (!game) notFound();

  const progress = gameProgress(game);
  const siguientes = nextSteps(game.trophies);
  const played = relativeDate(game.lastPlayedAt);

  // Las carpetas son de quien mira, no de quien se mira: solo tiene sentido
  // organizar la biblioteca propia.
  const session = await auth();
  const esMio = session?.user?.id === profile.userId;
  const carpetas = esMio ? await listCollections(profile.userId) : [];
  const valoracion = await getCommunityRating(game.id);

  // El platino solo depende del juego base: contar también los trofeos de DLC
  // inflaba "lo que te falta" con cosas que no cuentan para él.
  const reparto = repartoDlc(game.trophies);
  const dificultad = dificultadDeJuego(game.trophies);
  const faltanBase = reparto.base.total - reparto.base.earned;

  const faltanParaPlatino =
    progress.hasPlatinum && !progress.platinumEarned
      ? reparto.base.total > 0
        ? faltanBase
        : progress.total - progress.earned
      : null;

  // Sin sistema de platino (Steam), la meta es simplemente terminar el
  // juego: lo que falta es el resto del total. Con platino, es lo mismo que
  // ya se enseña arriba en "Trofeos para el platino".
  const faltanParaMeta = faltanParaPlatino ?? (
    !progress.hasPlatinum && progress.percent < 100 ? progress.total - progress.earned : 0
  );
  const eta = faltanParaMeta > 0 ? estimarEta(game.trophies, faltanParaMeta) : null;

  return (
    <div className="-mx-7 -mt-9">
      <div
        className="relative overflow-hidden border-b border-border"
        style={{ background: "linear-gradient(135deg, #2b1b3f 0%, #16233d 55%, #0b1018 100%)" }}
      >
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(rgba(10, 13, 19, 0.25), rgba(10, 13, 19, 0.9))" }}
        />
        <div className="relative mx-auto max-w-[1240px] px-7 pb-9 pt-7">
          <Link
            href={`/u/${handle}`}
            className="inline-block rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors hover:text-white"
            style={{ background: "rgba(10, 13, 19, 0.5)", border: "1px solid var(--border)", color: "#b9c6d8" }}
          >
            ← Biblioteca de @{handle}
          </Link>

          <div className="mt-7 grid items-end gap-6 lg:grid-cols-[150px_1fr_280px]">
            <span
              className="relative flex h-[100px] w-[100px] shrink-0 items-center justify-center overflow-hidden rounded-[20px] lg:h-[150px] lg:w-[150px]"
              style={{ background: coverGradient(game.id), boxShadow: "0 20px 50px rgba(0, 0, 0, 0.55)" }}
            >
              {game.iconUrl && (
                <img src={game.iconUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
              )}
            </span>

            <div className="min-w-0">
              <p className="mb-2.5 flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                <span
                  className="rounded-md px-2.5 py-1"
                  style={{ background: "rgb(var(--accent-rgb) / 0.14)", border: "1px solid rgb(var(--accent-rgb) / 0.3)", color: "var(--accent-text)" }}
                >
                  {game.deviceLabel}
                </span>
                {game.pegi && <Pegi edad={game.pegi} size="md" />}
                {played && `Jugado ${played}`}
              </p>

              <h1 className="font-heading text-4xl font-bold uppercase leading-none tracking-[-0.01em] lg:text-[52px]">
                {game.title}
              </h1>

              <div className="mt-5 flex max-w-[560px] items-center gap-4">
                <div
                  className="relative h-3 flex-1 overflow-hidden rounded-full"
                  style={{ background: "rgba(10, 13, 19, 0.7)", border: "1px solid var(--border)" }}
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ width: `${progress.percent}%`, background: "var(--accent-grad-h)" }}
                  />
                </div>
                <span className="font-heading text-2xl font-bold">{progress.percent}%</span>
              </div>

              {/* El desglose por metal solo existe en PSN; donde no lo hay,
                  el dato honesto es cuántos logros llevas del total. */}
              <div className="mt-4 flex flex-wrap items-center gap-5">
                {game.defined && game.earned ? (
                  (["platinum", "gold", "silver", "bronze"] as const).map((grade) => (
                    <div key={grade} className="flex items-center gap-2">
                      <TrophyIcon grade={grade} size={18} />
                      <span className="font-heading text-[15px] font-bold">
                        {game.earned![grade]}
                      </span>
                      <span className="text-[11px] text-muted">
                        de {game.defined![grade]} {gradeLabel(grade).toLowerCase()}
                        {game.defined![grade] === 1 ? "" : "s"}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-2">
                    <TrophyIcon grade="platinum" size={18} />
                    <span className="font-heading text-[15px] font-bold">
                      {progress.earned}
                    </span>
                    <span className="text-[11px] text-muted">
                      de {progress.total} logros
                    </span>
                  </div>
                )}
              </div>
            </div>

            {faltanParaPlatino !== null && (
              <div
                className="rounded-[18px] p-[22px]"
                style={{ border: "1px solid var(--border)", background: "rgba(13, 19, 28, 0.75)", backdropFilter: "blur(8px)" }}
              >
                <p className="font-heading text-5xl font-bold leading-[0.9] text-platinum lg:text-[56px]">
                  {faltanParaPlatino}
                </p>
                <p className="mt-2.5 text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--accent-text)" }}>
                  Trofeos para el platino
                </p>
                {reparto.tieneDlc && (
                  <p className="mt-2 text-[11px] text-muted">
                    Sin contar {reparto.dlc.total - reparto.dlc.earned} de DLC, que no
                    cuentan para el platino.
                  </p>
                )}
              </div>
            )}

            {/* Platino hecho pero quedan trofeos: son de DLC, y sin decirlo
                la barra al 77% parece que falta juego por terminar. */}
            {reparto.baseCompletoConDlcPendiente && (
              <div
                className="rounded-[18px] p-[22px]"
                style={{ border: "1px solid var(--border)", background: "rgba(13, 19, 28, 0.75)", backdropFilter: "blur(8px)" }}
              >
                <p className="font-heading text-5xl font-bold leading-[0.9] text-platinum lg:text-[56px]">
                  {reparto.dlc.total - reparto.dlc.earned}
                </p>
                <p className="mt-2.5 text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--accent-text)" }}>
                  Trofeos de DLC pendientes
                </p>
                <p className="mt-2 text-[11px] text-muted">
                  El juego base está al 100%: lo que queda son expansiones.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1240px] space-y-9 px-7 pb-24 pt-9">
        {dificultad && (
          <section
            className="rounded-[18px] p-5"
            style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
          >
            <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
              Dificultad estimada {dificultad.desdePlatino ? "del platino" : "del 100%"}
            </h2>

            <div className="flex flex-wrap items-center gap-3.5">
              <span
                className="rounded-lg px-3 py-1.5 text-[15px] font-bold text-white"
                style={{ background: dificultad.color }}
              >
                {dificultad.etiqueta}
              </span>

              {/* Seis barritas: la escala se ve de un vistazo sin tener que
                  saber qué significa un 0,4%. */}
              <span className="flex items-center gap-1" aria-hidden="true">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <span
                    key={n}
                    className="h-4 w-2 rounded-sm"
                    style={{
                      background: n <= dificultad.nivel ? dificultad.color : "var(--border)",
                    }}
                  />
                ))}
              </span>

              <span className="text-[13px] text-muted">
                Solo el{" "}
                <strong style={{ color: "var(--foreground)" }}>
                  {dificultad.rareza.toFixed(1)}%
                </strong>{" "}
                de quienes lo juegan lo consigue
              </span>
            </div>

            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              Estimada a partir de la rareza, que mezcla dificultad, duración y
              cuánta gente abandona el juego. No mide habilidad: un platino
              largo y fácil puede ser más raro que uno corto e imposible.
            </p>
          </section>
        )}

        {eta && <EtaPlatinoCard eta={eta} esMio={esMio} />}

        <section
          className="rounded-[18px] p-5"
          style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
        >
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
              Valoración de la comunidad
            </h2>
            <Link
              href={`/juego/${encodeURIComponent(game.id)}`}
              className="text-xs font-semibold text-accent hover:underline"
            >
              Ver estadísticas y reseñas de todos →
            </Link>
          </div>
          <CommunityRating rating={valoracion} />
        </section>

        {(esMio || game.review || game.rating) && (
          <section>
            {esMio ? (
              <ReviewEditor 
                gameId={game.id} 
                initialReview={game.review} 
                initialRating={game.rating ?? null} 
              />
            ) : (
              (game.review || game.rating) && (
                <div className="flex gap-3 p-5 border rounded-xl bg-surface border-border">
                  <Avatar src={resolveAvatarUrl(profile)} name={profile.displayName ?? handle} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2 mb-3 items-center">
                      <span className="text-xs font-bold uppercase tracking-widest text-[rgb(var(--accent-rgb))]">Reseña de {profile.displayName ?? handle}</span>
                      {game.rating && <Stars value={game.rating} size={13} />}
                      {game.reviewDate && <span className="text-xs text-muted">{game.reviewDate.split("T")[0]}</span>}
                    </div>
                    {game.review && (
                      <p className="text-[15px] leading-relaxed whitespace-pre-wrap italic">
                        &quot;{game.review}&quot;
                      </p>
                    )}
                  </div>
                </div>
              )
            )}
          </section>
        )}

        {esMio && <CollectionPicker collections={carpetas} gameId={game.id} />}

        {siguientes.length > 0 && (
          <section>
            <div className="mb-1.5 flex flex-wrap items-center gap-3">
              <h2 className="font-heading text-2xl font-bold">Próximos pasos</h2>
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em]"
                style={{ background: "rgb(var(--accent-rgb) / 0.14)", border: "1px solid rgb(var(--accent-rgb) / 0.32)", color: "var(--accent-text)" }}
              >
                Lo más a mano
              </span>

              {/* Solo para el dueño: el modo enfoque sincroniza contra la
                  plataforma, así que en un perfil ajeno no pinta nada. */}
              {esMio && (
                <Link
                  href={`/u/${handle}/${gameId}/enfoque`}
                  className="ml-auto rounded-[10px] px-3.5 py-2 text-[13px] font-bold text-background transition-all hover:-translate-y-0.5 hover:shadow-[0_0_16px_rgb(var(--accent-rgb) / 0.4)]"
                  style={{ background: "var(--accent-grad)" }}
                >
                  Modo enfoque
                </Link>
              )}
            </div>
            <p className="mb-4 text-[13px] text-muted">
              Ordenado por lo que más gente consigue. El platino va siempre al
              final: no es una tarea, es la consecuencia.
            </p>
            <div className="grid gap-2.5">
              {siguientes.map((t) => (
                <ProximoRow key={t.id} trophy={t} />
              ))}
            </div>
          </section>
        )}

        {game.platform === "manual" ? (
          esMio && <ManualGameStatus gameId={game.id} completed={progress.percent === 100} />
        ) : (
          <section>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-heading text-2xl font-bold">Todos los trofeos</h2>
              <span className="text-[13px] text-muted">
                {progress.earned} de {progress.total} conseguidos
              </span>
            </div>
            <TrophyList 
              trophies={game.trophies} 
              gameTitle={game.title} 
              gameId={game.id}
              esMio={esMio}
              showcaseTrophies={profile.showcaseTrophies ?? []}
            />
          </section>
        )}
      </div>
    </div>
  );
}
