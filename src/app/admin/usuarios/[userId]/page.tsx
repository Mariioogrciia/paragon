import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { getProfileByUserId } from "@/lib/profiles";
import { getAdminUserDetail, getAdminUserRecentTrophies } from "@/lib/admin";
import { PLATFORM_LABEL, type AccountPlatform } from "@/lib/types";
import { relativeDate } from "@/lib/design";
import { Avatar } from "@/components/Avatar";
import { BackButton } from "@/components/BackButton";
import Link from "next/link";

export const metadata = { title: "Usuario · Admin · Paragon" };

const CARD = { border: "1px solid var(--border)", background: "linear-gradient(var(--surface), var(--background))" };

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-[14px] p-4" style={CARD}>
      <p className="font-heading text-2xl font-bold">{value}</p>
      <p className="mt-1 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-muted">{label}</p>
    </div>
  );
}

export default async function AdminUserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/entrar");

  const profile = await getProfileByUserId(session.user.id);
  if (!profile?.esDesarrollador) redirect("/");

  const { userId } = await params;

  const detail = await getAdminUserDetail(userId);
  if (!detail) notFound();

  const trofeos = await getAdminUserRecentTrophies(userId, 20);

  return (
    <div className="space-y-9 max-w-[1000px] mx-auto px-4 py-8">
      <BackButton fallbackHref="/admin" />

      <div className="flex items-center gap-4">
        <Avatar src={detail.image} name={detail.name ?? detail.handle ?? "?"} size={64} />
        <div>
          <h1 className="font-heading text-2xl font-bold">{detail.name ?? detail.handle}</h1>
          {detail.handle && (
            <Link href={`/u/${detail.handle}`} className="text-sm text-muted hover:text-[rgb(var(--accent-rgb))] hover:underline">
              @{detail.handle} — ver perfil público
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value={detail.juegos} label="Juegos" />
        <Stat value={detail.platinos} label="Platinos" />
        <Stat value={detail.insignias} label="Insignias" />
        <Stat value={relativeDate(detail.createdAt) ?? "—"} label="Se unió" />
      </div>

      <section>
        <h2 className="font-heading mb-3 text-lg font-bold uppercase tracking-wide">Cuentas vinculadas</h2>
        {detail.cuentas.length === 0 ? (
          <p className="text-sm text-muted">Ninguna cuenta vinculada.</p>
        ) : (
          <div className="overflow-x-auto rounded-[14px]" style={CARD}>
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-muted">
                  <th className="px-4 py-3">Plataforma</th>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Pública</th>
                  <th className="px-4 py-3">Último intento</th>
                  <th className="px-4 py-3">Última sincronización con éxito</th>
                </tr>
              </thead>
              <tbody>
                {detail.cuentas.map((c) => (
                  <tr key={c.platform} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 font-semibold">{PLATFORM_LABEL[c.platform as AccountPlatform] ?? c.platform}</td>
                    <td className="px-4 py-2.5 text-muted">{c.username}</td>
                    <td className="px-4 py-2.5">
                      {c.isPublic ? (
                        <span className="text-green-500">Sí</span>
                      ) : (
                        <span className="text-yellow-500">No</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted">{c.lastAttemptedAt ? relativeDate(c.lastAttemptedAt) : "—"}</td>
                    <td className="px-4 py-2.5 text-muted">{c.syncedAt ? relativeDate(c.syncedAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-heading mb-3 text-lg font-bold uppercase tracking-wide">Últimos trofeos</h2>
        {trofeos.length === 0 ? (
          <p className="text-sm text-muted">Todavía no tiene ningún trofeo registrado.</p>
        ) : (
          <div className="overflow-x-auto rounded-[14px]" style={CARD}>
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-muted">
                  <th className="px-4 py-3">Juego</th>
                  <th className="px-4 py-3">Trofeo</th>
                  <th className="px-4 py-3">Rareza</th>
                  <th className="px-4 py-3">Cuándo</th>
                </tr>
              </thead>
              <tbody>
                {trofeos.map((tr, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-muted max-w-[180px] truncate" title={tr.gameTitle ?? ""}>{tr.gameTitle ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {tr.grade && (
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{
                              background:
                                tr.grade === "platinum" ? "var(--platinum)" :
                                tr.grade === "gold" ? "var(--gold)" :
                                tr.grade === "silver" ? "var(--silver)" : "var(--bronze)",
                            }}
                          />
                        )}
                        <span className="max-w-[240px] truncate" title={tr.trophyName}>{tr.trophyName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-muted">{tr.rarityPercent != null ? `${tr.rarityPercent.toFixed(1)}%` : "—"}</td>
                    <td className="px-4 py-2.5 text-muted">{tr.earnedAt ? relativeDate(tr.earnedAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
