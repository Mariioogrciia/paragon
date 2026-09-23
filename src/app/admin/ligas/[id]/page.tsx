import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { getProfileByUserId } from "@/lib/profiles";
import { getAdminLeagueDetail } from "@/lib/admin";
import { relativeDate } from "@/lib/design";
import { BackButton } from "@/components/BackButton";
import { adminDeleteLeagueAction } from "@/app/actions";
import Link from "next/link";

export const metadata = { title: "Liga · Admin · Paragon" };

const CARD = { border: "1px solid var(--border)", background: "linear-gradient(var(--surface), var(--background))" };

const UNIDAD: Record<string, string> = { dias: "días", semanas: "semanas", meses: "meses", anios: "años" };

export default async function AdminLeagueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/entrar");

  const profile = await getProfileByUserId(session.user.id);
  if (!profile?.esDesarrollador) redirect("/");

  const { id } = await params;

  const liga = await getAdminLeagueDetail(id);
  if (!liga) notFound();

  return (
    <div className="space-y-9 max-w-[900px] mx-auto px-4 py-8">
      <BackButton fallbackHref="/admin?tab=leagues" />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">{liga.name}</h1>
          <p className="mt-1 text-sm text-muted">
            Creada por{" "}
            {liga.ownerHandle ? (
              <Link href={`/u/${liga.ownerHandle}`} className="hover:text-[rgb(var(--accent-rgb))] hover:underline">
                @{liga.ownerHandle}
              </Link>
            ) : (
              liga.ownerName ?? "—"
            )}
            {" · "}
            {relativeDate(liga.createdAt)}
          </p>
        </div>

        <form action={adminDeleteLeagueAction}>
          <input type="hidden" name="leagueId" value={liga.id} />
          <button className="rounded bg-red-500/10 text-red-500 px-3.5 py-2 text-xs font-bold transition-colors hover:bg-red-500 hover:text-white">
            Eliminar liga
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-[14px] p-4" style={CARD}>
          <p className="font-heading text-lg font-bold">{liga.members.length}</p>
          <p className="mt-1 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-muted">Miembros</p>
        </div>
        <div className="rounded-[14px] p-4" style={CARD}>
          <p className="font-heading text-lg font-bold">{liga.challengeGameTitle ?? "Ninguno"}</p>
          <p className="mt-1 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-muted">Reto</p>
        </div>
        <div className="rounded-[14px] p-4" style={CARD}>
          <p className="font-heading text-lg font-bold">
            {liga.durationValue && liga.durationUnit ? `${liga.durationValue} ${UNIDAD[liga.durationUnit] ?? liga.durationUnit}` : "Sin fin"}
          </p>
          <p className="mt-1 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-muted">Duración</p>
        </div>
        <div className="rounded-[14px] p-4" style={CARD}>
          <p className="font-heading text-lg font-bold">{liga.awarded ? "Premiada" : liga.endsAt && new Date(liga.endsAt) < new Date() ? "Terminada" : "Activa"}</p>
          <p className="mt-1 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-muted">Estado</p>
        </div>
      </div>

      <section>
        <h2 className="font-heading mb-3 text-lg font-bold uppercase tracking-wide">Clasificación y miembros</h2>
        <div className="overflow-x-auto rounded-[14px]" style={CARD}>
          <table className="w-full min-w-[500px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-muted">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Se unió</th>
                <th className="px-4 py-3 text-right">Puntos</th>
              </tr>
            </thead>
            <tbody>
              {liga.members.map((m, i) => (
                <tr key={m.userId} className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-2.5 text-muted">{m.status === "accepted" ? i + 1 : "—"}</td>
                  <td className="px-4 py-2.5 font-semibold">
                    {m.handle ? (
                      <Link href={`/u/${m.handle}`} className="hover:text-[rgb(var(--accent-rgb))] hover:underline">
                        @{m.handle}
                      </Link>
                    ) : (
                      m.name ?? "—"
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {m.status === "accepted" ? (
                      <span className="text-green-500">Aceptada</span>
                    ) : (
                      <span className="text-yellow-500">Pendiente</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted">{relativeDate(m.joinedAt)}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-[rgb(var(--accent-rgb))]">
                    {m.status === "accepted" ? m.points.toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
              {liga.members.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">Esta liga no tiene miembros.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
