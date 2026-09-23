import { getLigaMensual } from "@/lib/ligas";
import { listUserLeagues, listPendingLeagueInvites } from "@/lib/leagues";
import { getMonthlyLeagueHistory } from "@/lib/trophyCase";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Avatar } from "@/components/Avatar";
import Link from "next/link";
import { TrophyIcon, TrophyTile } from "@/components/TrophyIcon";
import { LigaMensualFila } from "@/components/LigaMensualFila";
import { BackButton } from "@/components/BackButton";
import { NewLeagueForm } from "@/components/forms/Forms";
import { acceptLeagueInviteAction, declineLeagueInviteAction } from "@/app/actions";

export const metadata = {
  title: "Liga Mensual - Paragon",
};

export default async function LigasPage() {
  const t = await getTranslations("Perfil");
  const session = await auth();
  const [ranking, misLigas, invitaciones, historial] = await Promise.all([
    getLigaMensual(),
    session?.user?.id ? listUserLeagues(session.user.id) : Promise.resolve([]),
    session?.user?.id ? listPendingLeagueInvites(session.user.id) : Promise.resolve([]),
    getMonthlyLeagueHistory(6),
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
                <LigaMensualFila key={user.userId} user={user} index={index} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {historial.length > 0 && (
        <div className="mt-10">
          <h2 className="font-heading text-xl font-bold mb-4">{t("LigasPage.historialTitulo")}</h2>
          {/* Un ganador ABSOLUTO por mes, nunca Top 3 — mismo criterio que
              la vitrina del perfil (ver components/TrophyCase.tsx), así que
              esta lista es siempre una fila por periodo, sin agrupar. */}
          <div className="flex flex-col gap-2">
            {historial.map((c) => (
              <Link
                key={c.periodo}
                href={c.handle ? `/u/${c.handle}` : "#"}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5 transition-colors hover:bg-white/5"
              >
                <TrophyTile grade="platinum" size={32} />
                <span className="min-w-0 flex-1 text-xs font-bold uppercase tracking-wide text-muted">{c.titulo}</span>
                <Avatar src={c.image} name={c.name ?? c.handle ?? "?"} size={28} />
                <span className="shrink-0 text-sm font-bold">{c.name ?? `@${c.handle}`}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
