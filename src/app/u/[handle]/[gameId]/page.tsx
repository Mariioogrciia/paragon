/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { CollectionPicker } from "@/components/Collections";
import { CommunityRating } from "@/components/CommunityRating";
import { gradeLabel, TrophyIcon, TrophyTile } from "@/components/TrophyIcon";
import { ReviewEditor } from "@/components/ReviewEditor";
import { TrophyList } from "@/components/TrophyList";
import { listCollections } from "@/lib/collections";
import { colorFor, coverGradient, rarity, relativeDate } from "@/lib/design";
import { getGameDetail, getProfileByHandle } from "@/lib/profiles";
import { getCommunityRating } from "@/lib/ratings";
import { gameProgress, nextSteps } from "@/lib/stats";
import type { Trophy } from "@/lib/types";

function ProximoRow({ trophy }: { trophy: Trophy }) {
  const r = trophy.rarityPercent !== undefined ? rarity(trophy.rarityPercent) : null;

  return (
    <div
      className="grid grid-cols-[52px_1fr] items-center gap-4 rounded-2xl p-4 sm:grid-cols-[52px_1fr_190px] sm:gap-[18px]"
      style={{ border: "1px solid var(--border)", background: "linear-gradient(#131a26, #0e131c)" }}
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

  const faltanParaPlatino =
    progress.hasPlatinum && !progress.platinumEarned ? progress.total - progress.earned : null;

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
            className="inline-block rounded-full px-3.5 py-1.5 text-xs font-semibold"
            style={{ background: "rgba(10, 13, 19, 0.5)", border: "1px solid #2a3446", color: "#b9c6d8" }}
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
                  style={{ background: "rgba(74, 158, 255, 0.14)", border: "1px solid rgba(74, 158, 255, 0.3)", color: "#9ecbff" }}
                >
                  {game.deviceLabel}
                </span>
                {played && `Jugado ${played}`}
              </p>

              <h1 className="font-heading text-4xl font-bold uppercase leading-none tracking-[-0.01em] lg:text-[52px]">
                {game.title}
              </h1>

              <div className="mt-5 flex max-w-[560px] items-center gap-4">
                <div
                  className="relative h-3 flex-1 overflow-hidden rounded-full"
                  style={{ background: "rgba(10, 13, 19, 0.7)", border: "1px solid #2a3446" }}
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ width: `${progress.percent}%`, background: "linear-gradient(90deg, #4a9eff, #9fd4ec)" }}
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
                style={{ border: "1px solid #2a3a4d", background: "rgba(13, 19, 28, 0.75)", backdropFilter: "blur(8px)" }}
              >
                <p className="font-heading text-5xl font-bold leading-[0.9] text-platinum lg:text-[56px]">
                  {faltanParaPlatino}
                </p>
                <p className="mt-2.5 text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: "#cfe4ff" }}>
                  Trofeos para el platino
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1240px] space-y-9 px-7 pb-24 pt-9">
        <section
          className="rounded-[18px] p-5"
          style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
        >
          <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
            Valoración de la comunidad
          </h2>
          <CommunityRating rating={valoracion} />
        </section>

        {(esMio || game.review) && (
          <section>
            {esMio ? (
              <ReviewEditor 
                gameId={game.id} 
                initialReview={game.review} 
                initialDate={game.reviewDate} 
              />
            ) : (
              game.review && (
                <div className="p-5 border rounded-xl bg-card border-border">
                  <div className="flex gap-2 mb-3">
                    <span className="text-xs font-bold uppercase tracking-widest text-accent">Reseña de {profile.displayName ?? handle}</span>
                    {game.reviewDate && <span className="text-xs text-muted">{game.reviewDate.split("T")[0]}</span>}
                  </div>
                  <p className="text-[15px] leading-relaxed whitespace-pre-wrap italic">
                    "{game.review}"
                  </p>
                </div>
              )
            )}
          </section>
        )}

        {esMio && <CollectionPicker collections={carpetas} gameId={game.id} />}

        {siguientes.length > 0 && (
          <section>
            <div className="mb-1.5 flex items-center gap-3">
              <h2 className="font-heading text-2xl font-bold">Próximos pasos</h2>
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em]"
                style={{ background: "rgba(74, 158, 255, 0.14)", border: "1px solid rgba(74, 158, 255, 0.32)", color: "#9ecbff" }}
              >
                Lo más a mano
              </span>
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

        <section>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-heading text-2xl font-bold">Todos los trofeos</h2>
            <span className="text-[13px] text-muted">
              {progress.earned} de {progress.total} conseguidos
            </span>
          </div>
          <TrophyList trophies={game.trophies} />
        </section>
      </div>
    </div>
  );
}
