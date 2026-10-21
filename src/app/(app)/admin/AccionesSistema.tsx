import Link from "@/components/Enlace";
import { getTranslations } from "next-intl/server";
import { adminAvisoATodosAction, adminLanzarCronAction, adminPausarPlataformaAction } from "@/app/actions";
import { PLATAFORMAS_PAUSABLES, plataformasPausadas } from "@/lib/ajustesSistema";
import { getCuentasConProblemas } from "@/lib/admin";
import { PLATFORM_LABEL } from "@/lib/types";

/**
 * Admin → Sistema → Acciones (21 oct 2026). Sustituye a los dos controles
 * de mentira que había ("Modo mantenimiento" y "Detener Xbox", siempre en
 * "Próximamente") por controles que hacen algo: pausar la sincronización de
 * una plataforma, lanzar el cron, mandar un aviso a todos, y la lista de
 * cuentas que no consiguen sincronizar. Todo deja rastro en Registro.
 */

const CARD = { border: "1px solid var(--border)", background: "linear-gradient(var(--surface), var(--background))" };
const BOTON = "rounded-full px-4 py-2 text-xs font-bold transition-colors";
const CAMPO = "w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2 text-sm focus:border-accent focus:outline-none";

export async function AccionesSistema({ avisoEstado, avisoN, locale }: { avisoEstado?: string; avisoN?: number; locale: string }) {
  const [t, pausadas, cuentas] = await Promise.all([getTranslations("Admin"), plataformasPausadas(), getCuentasConProblemas()]);

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-heading mb-3 text-lg font-bold uppercase tracking-wide">{t("acciones.titulo")}</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-4 rounded-[14px] p-5" style={CARD}>
            <div>
              <h3 className="font-bold">{t("acciones.pausas")}</h3>
              <p className="mt-0.5 text-xs text-muted">{t("acciones.pausasAyuda")}</p>
            </div>
            <ul className="flex flex-col gap-2">
              {PLATAFORMAS_PAUSABLES.map((p) => {
                const pausada = pausadas.has(p);
                return (
                  <li key={p} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <span className={`h-2 w-2 rounded-full ${pausada ? "bg-yellow-500" : "bg-green-500"}`} aria-hidden="true" />
                      {PLATFORM_LABEL[p]}
                      <span className="text-xs font-normal text-muted">· {pausada ? t("acciones.pausada") : t("acciones.activa")}</span>
                    </span>
                    <form action={adminPausarPlataformaAction}>
                      <input type="hidden" name="plataforma" value={p} />
                      <input type="hidden" name="pausar" value={pausada ? "0" : "1"} />
                      <button type="submit" className={`${BOTON} border border-border hover:border-accent`}>
                        {pausada ? t("acciones.reanudar") : t("acciones.pausar")}
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
            <div className="h-px w-full bg-border" />
            <form action={adminLanzarCronAction} className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-bold">{t("acciones.lanzarCron")}</h3>
                <p className="mt-0.5 text-xs text-muted">{t("acciones.lanzarCronAyuda")}</p>
              </div>
              <button type="submit" className={`${BOTON} text-[var(--background)]`} style={{ background: "rgb(var(--accent-rgb))" }}>
                {t("acciones.lanzarCron")}
              </button>
            </form>
          </div>

          <form action={adminAvisoATodosAction} className="flex flex-col gap-3 rounded-[14px] p-5" style={CARD}>
            <h3 className="font-bold">{t("acciones.avisoTodos")}</h3>
            {avisoEstado === "ok" && <p className="text-xs font-semibold text-green-500">✓ {t("acciones.avisoOk", { n: avisoN ?? 0 })}</p>}
            {avisoEstado === "vacio" && <p className="text-xs font-semibold text-red-400">✕ {t("acciones.avisoVacio")}</p>}
            <input name="titulo" maxLength={120} placeholder={t("acciones.avisoTitulo")} aria-label={t("acciones.avisoTitulo")} className={CAMPO} />
            <textarea name="texto" maxLength={400} rows={3} placeholder={t("acciones.avisoTexto")} aria-label={t("acciones.avisoTexto")} className={CAMPO} />
            <input name="ruta" maxLength={200} placeholder={t("acciones.avisoRuta")} aria-label={t("acciones.avisoRuta")} className={CAMPO} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="push" className="h-4 w-4 accent-[rgb(var(--accent-rgb))]" />
              {t("acciones.avisoPush")}
            </label>
            <button type="submit" className={`${BOTON} self-start text-[var(--background)]`} style={{ background: "rgb(var(--accent-rgb))" }}>
              {t("acciones.avisoEnviar")}
            </button>
          </form>
        </div>
      </section>

      <section>
        <h2 className="font-heading mb-1 text-lg font-bold uppercase tracking-wide">{t("acciones.cuentasProblema")}</h2>
        <p className="mb-3 text-xs text-muted">{t("acciones.cuentasProblemaAyuda")}</p>
        {cuentas.length === 0 ? (
          <p className="text-sm text-muted">{t("acciones.ninguna")}</p>
        ) : (
          <div className="overflow-x-auto rounded-[14px]" style={CARD}>
            <table className="w-full min-w-[500px] text-sm">
              <tbody>
                {cuentas.map((c) => (
                  <tr key={`${c.userId}-${c.platform}`} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/usuarios/${c.userId}`} className="font-semibold hover:text-accent">
                        {c.handle ? `@${c.handle}` : c.userId.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-muted">{PLATFORM_LABEL[c.platform as keyof typeof PLATFORM_LABEL] ?? c.platform}</td>
                    <td className="px-4 py-2.5">{c.username}</td>
                    <td className="px-4 py-2.5 text-xs text-muted">
                      {t("acciones.ultimaBuena", {
                        fecha: c.syncedAt ? c.syncedAt.toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : t("acciones.nunca"),
                      })}
                    </td>
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
