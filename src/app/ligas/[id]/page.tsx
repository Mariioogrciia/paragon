import { getLeagueDetail } from "@/lib/leagues";
import { listFriends, getProfileByUserId, getLibrary } from "@/lib/profiles";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import Link from "next/link";
import { BackButton } from "@/components/BackButton";
import { AddLeagueMemberForm, SetLeagueChallengeForm } from "@/components/forms/Forms";
import { removeLeagueMemberAction, deleteLeagueAction } from "@/app/actions";
import { TrophyIcon } from "@/components/TrophyIcon";

export const metadata = {
  title: "Liga - Paragon",
};

const ETIQUETA_UNIDAD: Record<string, [string, string]> = {
  dias: ["día", "días"],
  semanas: ["semana", "semanas"],
  meses: ["mes", "meses"],
  anios: ["año", "años"],
};

function textoDuracion(value: number | null, unit: string | null, endsAt: string | null): string {
  if (!endsAt) return "Sin fecha de fin.";
  const fecha = new Date(endsAt).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  if (value && unit && ETIQUETA_UNIDAD[unit]) {
    const [singular, plural] = ETIQUETA_UNIDAD[unit];
    return `${value} ${value === 1 ? singular : plural} — termina el ${fecha}.`;
  }
  return `Termina el ${fecha}.`;
}

export default async function LeaguePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/entrar");

  const { id } = await params;
  const [league, amigos] = await Promise.all([
    getLeagueDetail(id, session.user.id),
    listFriends(session.user.id),
  ]);

  if (!league) notFound();

  const isOwner = league.ownerId === session.user.id;
  const ocupados = new Set([
    ...league.standings.map((s) => s.userId),
    ...league.pendingMembers.map((p) => p.userId),
  ]);
  const candidatos = amigos
    .filter((a) => !ocupados.has(a.userId))
    .map((a) => ({ userId: a.userId, label: a.displayName ?? a.handle ?? "Amigo" }));

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
        <h1 className="font-heading text-3xl font-bold mb-2">{league.name}</h1>
        <p className="text-muted">Clasificación desde que se creó — solo entre los miembros de esta liga.</p>
        <p className="text-muted text-sm mt-1">{textoDuracion(league.durationValue, league.durationUnit, league.endsAt)}</p>
      </div>

      <div className="bg-surface border border-border rounded-[18px] overflow-hidden shadow-sm mb-10">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-black/20 text-xs font-bold uppercase tracking-wider text-muted">
              <th className="p-4 w-16 text-center">Pos</th>
              <th className="p-4">Cazador</th>
              <th className="p-4 text-right">Puntos</th>
              {isOwner && <th className="p-4 w-20" />}
            </tr>
          </thead>
          <tbody>
            {league.standings.map((member, index) => (
              <tr key={member.userId} className="border-b border-border">
                <td className="p-4 text-center">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm text-muted bg-surface-2">
                    {index + 1}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar src={member.image} name={member.name ?? member.handle ?? "?"} size={36} />
                    {member.handle ? (
                      <Link href={`/u/${member.handle}`} className="font-bold hover:text-[rgb(var(--accent-rgb))] transition-colors">
                        {member.name ?? `@${member.handle}`}
                      </Link>
                    ) : (
                      <span className="font-bold">{member.name ?? "Alguien"}</span>
                    )}
                    {member.userId === league.ownerId && (
                      <span className="text-[0.625rem] font-bold uppercase tracking-wide text-muted">Dueño</span>
                    )}
                  </div>
                </td>
                <td className="p-4 text-right">
                  <span className="font-heading text-xl font-bold text-[rgb(var(--accent-rgb))]">
                    {member.points.toLocaleString()}
                  </span>
                </td>
                {isOwner && (
                  <td className="p-4 text-right">
                    {member.userId !== league.ownerId && (
                      <form action={removeLeagueMemberAction}>
                        <input type="hidden" name="leagueId" value={league.id} />
                        <input type="hidden" name="targetUserId" value={member.userId} />
                        <button className="text-xs font-semibold text-muted hover:text-danger">Quitar</button>
                      </form>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isOwner && league.pendingMembers.length > 0 && (
        <div className="mb-10">
          <h2 className="text-lg font-bold mb-2">Invitaciones sin responder</h2>
          <div className="flex flex-col gap-2">
            {league.pendingMembers.map((p) => (
              <div key={p.userId} className="flex items-center justify-between p-3.5 border rounded-xl border-dashed border-border bg-surface/50">
                <div className="flex items-center gap-3">
                  <Avatar src={p.image} name={p.name ?? p.handle ?? "?"} size={32} />
                  <span className="font-semibold text-sm">{p.name ?? p.handle ?? "Alguien"}</span>
                  <span className="text-xs text-muted">esperando respuesta</span>
                </div>
                <form action={removeLeagueMemberAction}>
                  <input type="hidden" name="leagueId" value={league.id} />
                  <input type="hidden" name="targetUserId" value={p.userId} />
                  <button className="text-xs font-semibold text-muted hover:text-danger">Cancelar invitación</button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-10">
        <h2 className="font-heading text-xl font-bold mb-2 flex items-center gap-2">
          <TrophyIcon grade="platinum" size={20} />
          Reto
        </h2>
        {league.challenge ? (
          <>
            <p className="text-muted text-sm mb-4">A ver quién le pilla antes el platino a <span className="font-semibold text-foreground">{league.challenge.title}</span>.</p>
            <div className="flex flex-col gap-2">
              {league.challenge.standings.map((member, index) => (
                <div key={member.userId} className="flex items-center justify-between p-3.5 border rounded-xl border-border bg-surface">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center text-sm font-bold text-muted">{index + 1}º</span>
                    <Avatar src={member.image} name={member.name ?? member.handle ?? "?"} size={32} />
                    <span className="font-semibold text-sm">{member.name ?? member.handle ?? "Alguien"}</span>
                  </div>
                  {member.hasPlatinum ? (
                    <span className="text-xs font-bold text-[rgb(var(--accent-rgb))]">
                      Platino · {new Date(member.platinumAt!).toLocaleDateString("es-ES")}
                    </span>
                  ) : (
                    <span className="text-xs text-muted">{member.progressPercent}%</span>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-muted text-sm mb-4">Sin reto todavía — {isOwner ? "elige un juego de tu biblioteca para picaros a ver quién lo platina antes." : "el dueño de la liga puede elegir un juego para picarse."}</p>
        )}
        {isOwner && (
          <div className="mt-4">
            <SetLeagueChallengeForm leagueId={league.id} juegos={juegosDelDueño} actual={league.challenge?.gameId ?? null} />
          </div>
        )}
      </div>

      {isOwner ? (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-lg font-bold mb-2">Invitar a un amigo</h2>
            <AddLeagueMemberForm leagueId={league.id} candidatos={candidatos} />
          </div>
          <div>
            <h2 className="text-lg font-bold mb-2 text-danger">Borrar liga</h2>
            <p className="text-sm text-muted mb-2">Borra la liga entera para todos sus miembros — no se puede deshacer.</p>
            <form action={deleteLeagueAction}>
              <input type="hidden" name="leagueId" value={league.id} />
              <button className="text-sm font-semibold text-danger hover:underline">Borrar esta liga</button>
            </form>
          </div>
        </div>
      ) : (
        <form action={removeLeagueMemberAction}>
          <input type="hidden" name="leagueId" value={league.id} />
          <input type="hidden" name="targetUserId" value={session.user.id} />
          <button className="text-sm font-semibold text-muted hover:text-danger">Salir de esta liga</button>
        </form>
      )}
    </div>
  );
}
