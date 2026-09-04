import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getProfileByUserId } from "@/lib/profiles";
import { getAdminOverview, getAdminUsers, getRecentSyncRuns, getAdminActivities } from "@/lib/admin";
import { PLATFORM_LABEL, type AccountPlatform } from "@/lib/types";
import { relativeDate } from "@/lib/design";
import { deleteActivityAction } from "@/app/actions";
import { BackButton } from "@/components/BackButton";

export const metadata = { title: "Admin · Paragon" };

const CARD = { border: "1px solid var(--border)", background: "linear-gradient(var(--surface), var(--background))" };

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-[14px] p-4" style={CARD}>
      <p className="font-heading text-2xl font-bold">{value}</p>
      <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{label}</p>
    </div>
  );
}

/**
 * Panel de administración. Solo lo ve `esDesarrollador` (profiles.ts) —
 * cualquier otra sesión, aunque escriba la URL a mano, se va a `/`. Nada de
 * lo de aquí es un dato nuevo que no exista ya en otro sitio agregado por
 * usuario; esto es lo mismo pero sin filtrar, para ver la plataforma
 * entera de un vistazo.
 */
export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/entrar");

  const profile = await getProfileByUserId(session.user.id);
  if (!profile?.esDesarrollador) redirect("/");

  const [overview, syncRuns, usuarios, activities] = await Promise.all([
    getAdminOverview(),
    getRecentSyncRuns(30),
    getAdminUsers(),
    getAdminActivities(50),
  ]);

  return (
    <div className="space-y-9">
      <BackButton fallbackHref="/" />
      <div>
        <h1 className="font-heading text-[32px] font-bold uppercase leading-none">Admin</h1>
        <p className="mt-2 text-sm text-muted">Solo tú ves esto. Métricas de toda la plataforma, no de un perfil.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat value={overview.usuarios} label="Usuarios" />
        <Stat value={`+${overview.usuariosNuevosUltimos7Dias}`} label="Nuevos, últimos 7 días" />
        <Stat value={overview.juegosEnCatalogo} label="Juegos en catálogo" />
        <Stat
          value={`${overview.juegosEnCatalogo > 0 ? Math.round((overview.juegosConPegi / overview.juegosEnCatalogo) * 100) : 0}%`}
          label="Con PEGI"
        />
        <Stat value={overview.trofeosRegistrados.toLocaleString("es-ES")} label="Trofeos registrados" />
        <Stat value={overview.avisosGenerados} label="Avisos generados" />
        <Stat value={overview.avisosUltimos7Dias} label="Avisos, últimos 7 días" />
        <Stat
          value={overview.cuentasPorPlataforma.reduce((n, c) => n + c.total, 0)}
          label="Cuentas vinculadas"
        />
      </div>

      <section>
        <h2 className="font-heading mb-3 text-lg font-bold uppercase tracking-wide">Cuentas por plataforma</h2>
        <div className="flex flex-wrap gap-2">
          {overview.cuentasPorPlataforma.map((c) => (
            <span
              key={c.platform}
              className="rounded-full px-3 py-1.5 text-xs font-bold"
              style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
            >
              {PLATFORM_LABEL[c.platform as AccountPlatform] ?? c.platform} · {c.total}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-heading mb-3 text-lg font-bold uppercase tracking-wide">Sincronizaciones recientes</h2>
        <div className="overflow-x-auto rounded-[14px]" style={CARD}>
          <table className="w-full min-w-[500px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Plataforma</th>
                <th className="px-4 py-3">Juegos</th>
                <th className="px-4 py-3">Trofeos nuevos</th>
                <th className="px-4 py-3">Cuándo</th>
              </tr>
            </thead>
            <tbody>
              {syncRuns.map((run) => (
                <tr key={run.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-semibold">@{run.handle ?? "?"}</td>
                  <td className="px-4 py-2.5 text-muted">{PLATFORM_LABEL[run.platform as AccountPlatform] ?? run.platform}</td>
                  <td className="px-4 py-2.5">{run.games}</td>
                  <td className="px-4 py-2.5">{run.newTrophies}</td>
                  <td className="px-4 py-2.5 text-muted">{relativeDate(run.createdAt) ?? "—"}</td>
                </tr>
              ))}
              {syncRuns.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">Todavía no hay sincronizaciones.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-heading mb-3 text-lg font-bold uppercase tracking-wide">Usuarios</h2>
        <div className="overflow-x-auto rounded-[14px]" style={CARD}>
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Cuentas</th>
                <th className="px-4 py-3">Juegos</th>
                <th className="px-4 py-3">Platinos</th>
                <th className="px-4 py-3">Insignias</th>
                <th className="px-4 py-3">Se unió</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.userId} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-semibold">{u.handle ? `@${u.handle}` : (u.displayName ?? "Sin nombre")}</td>
                  <td className="px-4 py-2.5 text-muted">
                    {u.cuentas.length === 0 ? "—" : u.cuentas.map((p) => PLATFORM_LABEL[p as AccountPlatform] ?? p).join(", ")}
                  </td>
                  <td className="px-4 py-2.5">{u.juegos}</td>
                  <td className="px-4 py-2.5">{u.platinos}</td>
                  <td className="px-4 py-2.5">{u.insignias}</td>
                  <td className="px-4 py-2.5 text-muted">{relativeDate(u.createdAt) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-heading mb-3 text-lg font-bold uppercase tracking-wide">Moderación (Feed Global)</h2>
        <div className="overflow-x-auto rounded-[14px]" style={CARD}>
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
                <th className="px-4 py-3">Autor</th>
                <th className="px-4 py-3">Juego</th>
                <th className="px-4 py-3">Contenido</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-semibold">
                    <div className="flex flex-col">
                      <span>{a.userName}</span>
                      <span className="text-xs text-muted">@{a.userHandle ?? "?"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-muted max-w-[200px] truncate" title={a.gameTitle ?? ""}>
                    {a.gameTitle ?? "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    {a.rating && (
                      <div className="flex gap-0.5 text-yellow-500 mb-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill={i < a.rating! ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                          </svg>
                        ))}
                      </div>
                    )}
                    <p className="text-sm break-words max-w-[350px]">
                      {a.review ? `"${a.review}"` : <span className="italic text-muted">Sin texto</span>}
                    </p>
                    <p className="text-xs text-muted mt-1">{relativeDate(a.createdAt)}</p>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <form action={deleteActivityAction}>
                      <input type="hidden" name="activityId" value={a.id} />
                      <button className="rounded bg-red-500/10 text-red-500 px-3 py-1.5 text-xs font-bold transition-colors hover:bg-red-500 hover:text-white">
                        Eliminar
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {activities.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">No hay actividades recientes para moderar.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
