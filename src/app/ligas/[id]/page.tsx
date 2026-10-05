import { getLeagueDetail, getPendingLeagueInvite } from "@/lib/leagues";
import { listFriends, getProfileByUserId, getLibrary } from "@/lib/profiles";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { Avatar } from "@/components/Avatar";
import Link from "next/link";
import { BackButton } from "@/components/BackButton";
import { AddLeagueMemberForm, SetLeagueChallengeForm } from "@/components/forms/Forms";
import { removeLeagueMemberAction, deleteLeagueAction, acceptLeagueInviteAction, declineLeagueInviteAction } from "@/app/actions";
import { TrophyIcon } from "@/components/TrophyIcon";
import { TrophyPhoto } from "@/components/TrophyList";
import { ConfirmForm } from "@/components/ui/ConfirmForm";
import { relativeDate } from "@/lib/design";
import { Dorsal } from "@/components/carreras/Dorsal";
import { libreaDe } from "@/lib/librea";
import { ChevronDown, ChevronUp } from "lucide-react";

export const metadata = {
  title: "Liga - Paragon",
};

const UNIDADES = ["dias", "semanas", "meses", "anios"] as const;

function textoDuracion(
  value: number | null,
  unit: string | null,
  endsAt: string | null,
  t: Awaited<ReturnType<typeof getTranslations>>,
  locale: string,
): string {
  if (!endsAt) return t("LigaPage.sinFechaFin");
  const fecha = new Date(endsAt).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
  if (value && unit && (UNIDADES as readonly string[]).includes(unit)) {
    const claves: Record<(typeof UNIDADES)[number], [string, string]> = {
      dias: ["unidadDia", "unidadDias"],
      semanas: ["unidadSemana", "unidadSemanas"],
      meses: ["unidadMes", "unidadMeses"],
      anios: ["unidadAnio", "unidadAnios"],
    };
    const [singularKey, pluralKey] = claves[unit as (typeof UNIDADES)[number]];
    const unidadTexto = t(`LigaPage.${value === 1 ? singularKey : pluralKey}`);
    return t("LigaPage.duracionConValor", { valor: value, unidad: unidadTexto, fecha });
  }
  return t("LigaPage.terminaEl", { fecha });
}

export default async function LeaguePage({ params }: { params: Promise<{ id: string }> }) {
  const idioma = await getLocale();
  const t = await getTranslations("Perfil");
  const session = await auth();
  if (!session?.user?.id) redirect("/entrar");

  const { id } = await params;
  const [league, amigos] = await Promise.all([
    getLeagueDetail(id, session.user.id),
    listFriends(session.user.id),
  ]);

  if (!league) {
    // No eres miembro aceptado — antes esto era un 404 sin más, incluso
    // cuando el motivo real era "tienes una invitación sin responder"
    // (el enlace de la notificación de invitación lleva aquí directo).
    const invite = await getPendingLeagueInvite(id, session.user.id);
    if (!invite) notFound();

    return (
      <div className="mx-auto max-w-[560px] px-7 py-12">
        <BackButton fallbackHref="/ligas" />
        <div className="mt-6 rounded-[18px] border border-border bg-surface p-6">
          <h1 className="font-heading text-2xl font-bold mb-2">{invite.name}</h1>
          <p className="text-muted text-sm mb-6">{t("LigaPage.invitacionTexto", { nombre: invite.ownerName ?? t("LigaPage.alguien") })}</p>
          <div className="flex items-center gap-3">
            <form action={acceptLeagueInviteAction}>
              <input type="hidden" name="leagueId" value={invite.id} />
              <button className="rounded-lg px-4 py-2 text-sm font-bold text-background" style={{ background: "var(--accent-grad)" }}>
                {t("LigaPage.invitacionAceptar")}
              </button>
            </form>
            <form action={declineLeagueInviteAction}>
              <input type="hidden" name="leagueId" value={invite.id} />
              <button className="text-sm font-semibold text-muted hover:text-danger">{t("LigaPage.invitacionRechazar")}</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const isOwner = league.ownerId === session.user.id;
  const ocupados = new Set([
    ...league.standings.map((s) => s.userId),
    ...league.pendingMembers.map((p) => p.userId),
  ]);
  const candidatos = amigos
    .filter((a) => !ocupados.has(a.userId))
    .map((a) => ({ userId: a.userId, label: a.displayName ?? a.handle ?? t("LigaPage.amigo") }));

  // Solo se pide la biblioteca completa si hace falta pintar el selector
  // (el dueño) — al resto de miembros esto no les sirve para nada.
  let juegosDelDueño: { id: string; title: string; deviceLabel: string }[] = [];
  if (isOwner) {
    const ownerProfile = await getProfileByUserId(league.ownerId);
    if (ownerProfile) {
      const library = await getLibrary(ownerProfile);
      juegosDelDueño = library.games
        .filter((g) => !g.isWishlist)
        .map((g) => ({ id: g.id, title: g.title, deviceLabel: g.deviceLabel }))
        .sort((a, b) => a.title.localeCompare(b.title));
    }
  }

  return (
    <div className="mx-auto max-w-[800px] px-7 py-12">
      <BackButton fallbackHref="/ligas" />

      <div className="mb-8">
        <h1 className="font-heading mb-2 text-[clamp(1.75rem,5vw,2.5rem)] font-bold uppercase leading-tight">
          <span className="carreras-titulo">{league.name}</span>
        </h1>
        <p className="text-muted">{t("LigaPage.clasificacionDesde")}</p>
        {league.terminada ? (
          // Terminada: la clasificación es definitiva (lib/trophyCase.ts la cierra y avisa a todos).
          <div className="mt-3 rounded-[14px] border border-border bg-surface px-4 py-3">
            <p className="text-sm font-bold">
              {t("LigaPage.terminada", {
                fecha: new Date(league.endsAt!).toLocaleDateString(idioma, { day: "numeric", month: "long", year: "numeric" }),
              })}
            </p>
            <p className="text-sm text-muted mt-1">
              {league.ganadores.length > 0
                ? t("LigaPage.ganador", {
                    nombres: league.standings
                      .filter((s) => league.ganadores.includes(s.userId))
                      .map((s) => s.name ?? (s.handle ? `@${s.handle}` : "?"))
                      .join(" · "),
                    puntos: (league.standings.find((s) => league.ganadores.includes(s.userId))?.points ?? 0).toLocaleString(idioma),
                  })
                : t("LigaPage.sinGanador")}
            </p>
          </div>
        ) : (
          <p className="text-muted text-sm mt-1">{textoDuracion(league.durationValue, league.durationUnit, league.endsAt, t, idioma)}</p>
        )}
      </div>

      <div className="mb-10 overflow-x-auto rounded-[18px] border border-border bg-surface">
        <table className="w-full min-w-[480px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted">
              <th className="w-20 py-3 pl-4 pr-2">{t("LigaPage.colPos")}</th>
              <th className="px-2 py-3">{t("LigaPage.colCazador")}</th>
              <th className="px-2 py-3 text-right">{t("LigaPage.colPuntos")}</th>
              <th className="w-24 py-3 pl-2 pr-4 text-right">{t("LigaPage.colDif")}</th>
              {isOwner && <th className="w-20 p-3" />}
            </tr>
          </thead>
          <tbody>
            {league.standings.map((member, index) => {
              const nombre = member.name ?? (member.handle ? `@${member.handle}` : t("LigaPage.alguien"));
              return (
                <tr key={member.userId} className="carreras-fila border-b border-border" style={{ ["--librea" as string]: libreaDe(member.userId).fondo }}>
                  <td className="py-3 pl-4 pr-2">
                    <Dorsal id={member.userId} texto={`P${index + 1}`} />
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar src={member.image} name={nombre} size={34} />
                      {member.handle ? (
                        <Link href={`/u/${member.handle}`} className="truncate rounded font-heading text-[0.9375rem] font-bold uppercase tracking-wide transition-colors hover:text-[var(--accent-text)]">
                          {nombre}
                        </Link>
                      ) : (
                        <span className="truncate font-heading text-[0.9375rem] font-bold uppercase tracking-wide">{nombre}</span>
                      )}
                      {member.userId === league.ownerId && (
                        <span className="shrink-0 text-[0.625rem] font-bold uppercase tracking-wide text-muted">{t("LigaPage.dueño")}</span>
                      )}
                      {/* `movimiento` sale de la foto semanal del cron (/api/cron/league-snapshot):
                          null hasta que corra para esta liga o para alguien recién unido. */}
                      {member.movimiento != null && member.movimiento !== 0 && (
                        <span className="inline-flex shrink-0 items-center text-[0.6875rem] font-bold tabular-nums" style={{ color: member.movimiento > 0 ? "#45d483" : "#ff6b6b" }}>
                          {member.movimiento > 0 ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
                          {Math.abs(member.movimiento)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-3 text-right">
                    <span className="carreras-cifra text-xl text-[var(--accent-text)]">{member.points.toLocaleString(idioma)}</span>
                  </td>
                  <td className="py-3 pl-2 pr-4 text-right">
                    <span className="carreras-cifra text-sm text-muted">
                      {index === 0 ? t("LigaPage.lider") : `−${(league.standings[0].points - member.points).toLocaleString(idioma)}`}
                    </span>
                  </td>
                  {isOwner && (
                    <td className="p-3 text-right">
                      {member.userId !== league.ownerId && (
                        <ConfirmForm
                          action={removeLeagueMemberAction}
                          hidden={{ leagueId: league.id, targetUserId: member.userId }}
                          title={t("LigaPage.quitarLiga")}
                          message={t("LigaPage.quitarLigaMensaje", { nombre: member.name ?? member.handle ?? t("LigaPage.alguien") })}
                          confirmLabel={t("LigaPage.quitarConfirmar")}
                          triggerClassName="text-xs font-semibold text-muted hover:text-danger"
                        >
                          {t("LigaPage.quitar")}
                        </ConfirmForm>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Entre foto semanal y foto semanal (el `movimiento` de arriba) la
          liga no tenía ninguna señal de vida — solo un número de puntos que
          cambiaba una vez a la semana. Esto es cualquier trofeo de
          cualquier miembro, no solo del reto fijo de abajo. */}
      {league.recentTrophies.length > 0 && (
        <div className="mb-10">
          <h2 className="font-heading text-xl font-bold mb-4">{t("LigaPage.actividadTitulo")}</h2>
          <div className="flex flex-col gap-2">
            {league.recentTrophies.map((tr, i) => (
              <div
                key={`${tr.userId}-${tr.gameId}-${tr.trophyName}-${i}`}
                className="flex items-center gap-3 rounded-xl p-3 border border-border bg-surface"
              >
                <Avatar src={tr.image} name={tr.name ?? tr.handle ?? "?"} size={32} />
                <TrophyPhoto trophy={{ iconUrl: tr.trophyIconUrl, grade: tr.grade }} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    <span className="font-bold">{tr.name ?? tr.handle ?? t("LigaPage.alguien")}</span>
                    {" "}
                    {t("LigaPage.actividadConsiguio", { trofeo: tr.trophyName })}
                  </p>
                  <p className="truncate text-xs text-muted">{tr.gameTitle}</p>
                </div>
                <span className="shrink-0 text-xs text-muted">{relativeDate(tr.earnedAt, idioma)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isOwner && league.pendingMembers.length > 0 && (
        <div className="mb-10">
          <h2 className="text-lg font-bold mb-2">{t("LigaPage.invitacionesSinResponderTitulo")}</h2>
          <div className="flex flex-col gap-2">
            {league.pendingMembers.map((p) => (
              <div key={p.userId} className="flex items-center justify-between p-3.5 border rounded-xl border-dashed border-border bg-surface/50">
                <div className="flex items-center gap-3">
                  <Avatar src={p.image} name={p.name ?? p.handle ?? "?"} size={32} />
                  <span className="font-semibold text-sm">{p.name ?? p.handle ?? t("LigaPage.alguien")}</span>
                  <span className="text-xs text-muted">{t("LigaPage.esperandoRespuesta")}</span>
                </div>
                <ConfirmForm
                  action={removeLeagueMemberAction}
                  hidden={{ leagueId: league.id, targetUserId: p.userId }}
                  title={t("LigaPage.cancelarInvitacionTitulo")}
                  message={t("LigaPage.cancelarInvitacionMensaje", { nombre: p.name ?? p.handle ?? t("LigaPage.alguien") })}
                  confirmLabel={t("LigaPage.cancelarConfirmar")}
                  triggerClassName="text-xs font-semibold text-muted hover:text-danger"
                >
                  {t("LigaPage.cancelarInvitacion")}
                </ConfirmForm>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-10">
        <h2 className="font-heading text-xl font-bold mb-2 flex items-center gap-2">
          <TrophyIcon grade="platinum" size={20} />
          {t("LigaPage.retoTitulo")}
        </h2>
        {league.challenge ? (
          <>
            <p className="text-muted text-sm mb-4">{t("LigaPage.retoDescripcion", { juego: league.challenge.title })}</p>
            <div className="flex flex-col gap-2">
              {league.challenge.standings.map((member, index) => (
                <div key={member.userId} className="flex items-center justify-between p-3.5 border rounded-xl border-border bg-surface">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center text-sm font-bold text-muted">{index + 1}º</span>
                    <Avatar src={member.image} name={member.name ?? member.handle ?? "?"} size={32} />
                    <span className="font-semibold text-sm">{member.name ?? member.handle ?? t("LigaPage.alguien")}</span>
                  </div>
                  {member.hasPlatinum ? (
                    <span className="text-xs font-bold text-[rgb(var(--accent-rgb))]">
                      {t("LigaPage.retoPlatino", { fecha: new Date(member.platinumAt!).toLocaleDateString(idioma) })}
                    </span>
                  ) : (
                    <span className="text-xs text-muted">{member.progressPercent}%</span>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-muted text-sm mb-4">{t("LigaPage.retoSinTodavia")}{isOwner ? t("LigaPage.retoSinDueño") : t("LigaPage.retoSinMiembro")}</p>
        )}
        {isOwner && !league.terminada && (
          <div className="mt-4">
            <SetLeagueChallengeForm leagueId={league.id} juegos={juegosDelDueño} actual={league.challenge?.gameId ?? null} />
          </div>
        )}
      </div>

      {isOwner ? (
        <div className="flex flex-col gap-6">
          {!league.terminada && (
            <div>
              <h2 className="text-lg font-bold mb-2">{t("LigaPage.invitarAmigoTitulo")}</h2>
              <AddLeagueMemberForm leagueId={league.id} candidatos={candidatos} />
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold mb-2 text-danger">{t("LigaPage.borrarLigaTitulo")}</h2>
            <p className="text-sm text-muted mb-2">{t("LigaPage.borrarLigaAyuda")}</p>
            <ConfirmForm
              action={deleteLeagueAction}
              hidden={{ leagueId: league.id }}
              title={t("LigaPage.borrarLigaConfirmTitulo")}
              message={t("LigaPage.borrarLigaConfirmMensaje", { nombre: league.name })}
              confirmLabel={t("LigaPage.borrarConfirmar")}
              triggerClassName="text-sm font-semibold text-danger hover:underline"
            >
              {t("LigaPage.borrarEstaLiga")}
            </ConfirmForm>
          </div>
        </div>
      ) : (
        <ConfirmForm
          action={removeLeagueMemberAction}
          hidden={{ leagueId: league.id, targetUserId: session.user.id }}
          title={t("LigaPage.salirTitulo")}
          message={t("LigaPage.salirMensaje", { nombre: league.name })}
          confirmLabel={t("LigaPage.salirConfirmar")}
          triggerClassName="text-sm font-semibold text-muted hover:text-danger"
        >
          {t("LigaPage.salirDeLaLiga")}
        </ConfirmForm>
      )}
    </div>
  );
}
