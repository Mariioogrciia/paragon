import { getLigaMensual } from "@/lib/ligas";
import { listUserLeagues, listPendingLeagueInvites } from "@/lib/leagues";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Avatar } from "@/components/Avatar";
import Link from "next/link";
import { TrophyIcon } from "@/components/TrophyIcon";
import { BackButton } from "@/components/BackButton";
import { NewLeagueForm } from "@/components/forms/Forms";
import { acceptLeagueInviteAction, declineLeagueInviteAction } from "@/app/actions";

export const metadata = {
  title: "Liga Mensual - Paragon",
};

export default async function LigasPage() {
  const t = await getTranslations("Perfil");
  const session = await auth();
  const [ranking, misLigas, invitaciones] = await Promise.all([
    getLigaMensual(),
    session?.user?.id ? listUserLeagues(session.user.id) : Promise.resolve([]),
    session?.user?.id ? listPendingLeagueInvites(session.user.id) : Promise.resolve([]),
  ]);

  const monthName = new Date().toLocaleString("es-ES", { month: "long" });
  const year = new Date().getFullYear();

  return (
    <div className="mx-auto max-w-[800px] px-7 py-12">
      <BackButton fallbackHref="/" />

      {session?.user?.id && invitaciones.length > 0 && (
        <div className="mb-8">
          <h2 className="font-heading text-xl font-bold mb-2">{t("LigasPage.invitacionesTitulo")}</h2>
          <div className="flex flex-col gap-2">
            {invitaciones.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-4 border rounded-xl border-border bg-surface">
                <div>
                  <span className="font-semibold">{inv.name}</span>
                  <p className="text-xs text-muted">{t("LigasPage.teHaInvitado", { nombre: inv.ownerName ?? t("LigasPage.alguien") })}</p>
                </div>
                <div className="flex items-center gap-2">
                  <form action={acceptLeagueInviteAction}>
                    <input type="hidden" name="leagueId" value={inv.id} />
                    <button className="rounded-lg px-3 py-1.5 text-xs font-bold text-background" style={{ background: "var(--accent-grad)" }}>
                      {t("LigasPage.aceptar")}
                    </button>
                  </form>
                  <form action={declineLeagueInviteAction}>
                    <input type="hidden" name="leagueId" value={inv.id} />
                    <button className="text-xs font-semibold text-muted hover:text-danger">{t("LigasPage.rechazar")}</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {session?.user?.id && (
        <div className="mb-12">
          <h2 className="font-heading text-xl font-bold mb-2">{t("LigasPage.tusLigasTitulo")}</h2>
          <p className="text-muted text-sm mb-4">
            {t("LigasPage.tusLigasAyuda")}
          </p>

          {misLigas.length > 0 && (
            <div className="flex flex-col gap-2 mb-4">
              {misLigas.map((liga) => (
                <Link
                  key={liga.id}
                  href={`/ligas/${liga.id}`}
                  className="flex items-center justify-between p-4 border rounded-xl border-border bg-surface hover:bg-accent/5 transition-colors"
                >
                  <span className="font-semibold">{liga.name}</span>
                  <span className="text-xs text-muted">{liga.memberCount} {liga.memberCount === 1 ? t("LigasPage.miembro") : t("LigasPage.miembros")}</span>
                </Link>
              ))}
            </div>
          )}

          <NewLeagueForm />
        </div>
      )}

      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold mb-2 uppercase tracking-wide flex items-center gap-2 text-[rgb(var(--accent-rgb))]">
          <TrophyIcon grade="platinum" size={32} />
          {t("LigasPage.tituloLiga", { mes: monthName, anio: year })}
        </h1>
        <p className="text-muted">{t("LigasPage.descripcion")}</p>
      </div>

      {ranking.length === 0 ? (
        <div className="p-8 text-center border border-dashed rounded-xl border-border bg-surface text-muted text-sm">
          {t("LigasPage.vacio")}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-[18px] overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-black/20 text-xs font-bold uppercase tracking-wider text-muted">
                <th className="p-4 w-16 text-center">{t("LigasPage.colPos")}</th>
                <th className="p-4">{t("LigasPage.colCazador")}</th>
                <th className="p-4 text-right">{t("LigasPage.colPuntos")}</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((user, index) => (
                <tr 
                  key={user.userId} 
                  className={`border-b border-border transition-colors hover:bg-black/10 ${index < 3 ? 'bg-[rgb(var(--accent-rgb)/0.03)]' : ''}`}
                >
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                      index === 0 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50' :
                      index === 1 ? 'bg-gray-400/20 text-gray-400 border border-gray-400/50' :
                      index === 2 ? 'bg-amber-700/20 text-amber-600 border border-amber-700/50' :
                      'text-muted bg-surface-2'
                    }`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar src={user.image} name={user.name ?? user.handle ?? "?"} size={36} />
                      {user.handle ? (
                        <Link href={`/u/${user.handle}`} className="font-bold hover:text-[rgb(var(--accent-rgb))] transition-colors">
                          {user.name ?? `@${user.handle}`}
                        </Link>
                      ) : (
                        <span className="font-bold">{user.name ?? t("LigasPage.alguien")}</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <span className="font-heading text-xl font-bold text-[rgb(var(--accent-rgb))]">
                      {user.points.toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
