import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getProfileByUserId } from "@/lib/profiles";
import { getAdminOverview, getAdminUsers, getRecentSyncRuns, getAdminActivities, getAdminLeagues } from "@/lib/admin";
import { PLATFORM_LABEL, type AccountPlatform } from "@/lib/types";
import { relativeDate } from "@/lib/design";
import { deleteActivityAction, adminDeleteLeagueAction } from "@/app/actions";
import { BackButton } from "@/components/BackButton";
import Link from "next/link";

export const metadata = { title: "Admin · Paragon" };

const CARD = { border: "1px solid var(--border)", background: "linear-gradient(var(--surface), var(--background))" };

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-[14px] p-4" style={CARD}>
      <p className="font-heading text-2xl font-bold">{value}</p>
      <p className="mt-1 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-muted">{label}</p>
    </div>
  );
}

export default async function AdminPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const session = await auth();
  if (!session?.user) redirect("/entrar");

  const profile = await getProfileByUserId(session.user.id);
  if (!profile?.esDesarrollador) redirect("/");

  const searchParams = await props.searchParams;
  const currentTab = typeof searchParams.tab === "string" ? searchParams.tab : "dashboard";

  const [overview, syncRuns, usuarios, activities, leagues] = await Promise.all([
    getAdminOverview(),
    getRecentSyncRuns(30),
    getAdminUsers(),
    getAdminActivities(50),
    getAdminLeagues(),
  ]);

  return (
    <div className="space-y-9 max-w-[1400px] mx-auto px-4 py-8">
      <BackButton fallbackHref="/" />
      
      <div>
        <h1 className="font-heading text-[2rem] font-bold uppercase leading-none">Admin Control Center</h1>
        <p className="mt-2 text-sm text-muted">Centro de control global de la plataforma.</p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-border pb-px overflow-x-auto">
        {[
          { id: "dashboard", label: "📊 Dashboard & Usuarios" },
          { id: "leagues", label: "🏆 Ligas" },
          { id: "system", label: "⚙️ Sistema & Moderación" },
        ].map(tab => (
          <Link
            key={tab.id}
            href={`/admin?tab=${tab.id}`}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
              currentTab === tab.id 
                ? "border-[rgb(var(--accent-rgb))] text-foreground" 
                : "border-transparent text-muted hover:text-foreground hover:border-border"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* TAB: DASHBOARD */}
      {currentTab === "dashboard" && (
        <div className="space-y-9">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            <h2 className="font-heading mb-3 text-lg font-bold uppercase tracking-wide">Usuarios</h2>
            <div className="overflow-x-auto rounded-[14px]" style={CARD}>
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-muted">
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
                    <tr key={u.userId} className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
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
        </div>
      )}

      {/* TAB: LIGAS */}
      {currentTab === "leagues" && (
        <section className="space-y-6">
          <div>
            <h2 className="font-heading mb-1 text-xl font-bold uppercase tracking-wide">Moderación de Ligas</h2>
            <p className="text-sm text-muted">Gestiona y elimina grupos inapropiados.</p>
          </div>
          
          <div className="overflow-x-auto rounded-[14px]" style={CARD}>
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-muted">
                  <th className="px-4 py-3">Liga</th>
                  <th className="px-4 py-3">Creador</th>
                  <th className="px-4 py-3">Miembros</th>
                  <th className="px-4 py-3">Creada</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {leagues.map((league) => (
                  <tr key={league.id} className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                    <td className="px-4 py-2.5 font-bold">{league.name}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col">
                        <span>{league.ownerName}</span>
                        <span className="text-xs text-muted">@{league.ownerHandle}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-[rgb(var(--accent-rgb))]">{league.members}</td>
                    <td className="px-4 py-2.5 text-muted">{new Date(league.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5 text-right">
                      <form action={adminDeleteLeagueAction}>
                        <input type="hidden" name="leagueId" value={league.id} />
                        <button className="rounded bg-red-500/10 text-red-500 px-3 py-1.5 text-xs font-bold transition-colors hover:bg-red-500 hover:text-white">
                          Eliminar
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
                {leagues.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted">No hay ligas creadas en la plataforma.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB: SISTEMA */}
      {currentTab === "system" && (
        <div className="space-y-9">
          
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Controles de Sistema (UI dummy para el futuro) */}
            <div>
              <h2 className="font-heading mb-3 text-lg font-bold uppercase tracking-wide">Controles de Sistema</h2>
              <div className="rounded-[14px] p-6 flex flex-col gap-4" style={CARD}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">Modo Mantenimiento</h3>
                    <p className="text-xs text-muted">Muestra una página de error a los usuarios.</p>
                  </div>
                  <button disabled className="bg-surface-2 text-muted px-4 py-2 rounded-full text-xs font-bold border border-border opacity-50 cursor-not-allowed">
                    Próximamente
                  </button>
                </div>
                <div className="h-px bg-border w-full" />
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">Detener Sincronización (Xbox)</h3>
                    <p className="text-xs text-muted">Previene bans temporales si OpenXBL cae.</p>
                  </div>
                  <button disabled className="bg-surface-2 text-muted px-4 py-2 rounded-full text-xs font-bold border border-border opacity-50 cursor-not-allowed">
                    Próximamente
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h2 className="font-heading mb-3 text-lg font-bold uppercase tracking-wide">Estado de Infraestructura</h2>
              <div className="rounded-[14px] p-6 flex flex-col gap-4" style={CARD}>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                  <span className="font-bold text-sm">Supabase Database</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                  <span className="font-bold text-sm">PlayStation Network (NPSSO)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                  <span className="font-bold text-sm">Steam Web API</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)]" />
                  <span className="font-bold text-sm">OpenXBL (Rate limit mode)</span>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-heading mb-3 text-lg font-bold uppercase tracking-wide">Sincronizaciones recientes</h2>
            <div className="overflow-x-auto rounded-[14px]" style={CARD}>
              <table className="w-full min-w-[500px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-muted">
                    <th className="px-4 py-3">Usuario</th>
                    <th className="px-4 py-3">Plataforma</th>
                    <th className="px-4 py-3">Juegos</th>
                    <th className="px-4 py-3">Trofeos nuevos</th>
                    <th className="px-4 py-3">Cuándo</th>
                  </tr>
                </thead>
                <tbody>
                  {syncRuns.map((run) => (
                    <tr key={run.id} className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                      <td className="px-4 py-2.5 font-semibold">@{run.handle ?? "?"}</td>
                      <td className="px-4 py-2.5 text-muted">{PLATFORM_LABEL[run.platform as AccountPlatform] ?? run.platform}</td>
                      <td className="px-4 py-2.5">{run.games}</td>
                      <td className="px-4 py-2.5 text-green-500 font-bold">+{run.newTrophies}</td>
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
            <h2 className="font-heading mb-3 text-lg font-bold uppercase tracking-wide">Moderación (Feed Global)</h2>
            <div className="overflow-x-auto rounded-[14px]" style={CARD}>
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-muted">
                    <th className="px-4 py-3">Autor</th>
                    <th className="px-4 py-3">Juego</th>
                    <th className="px-4 py-3">Contenido</th>
                    <th className="px-4 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((a) => (
                    <tr key={a.id} className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
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
      )}
    </div>
  );
}
