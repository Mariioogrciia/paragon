import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { marcarLeidoAction } from "@/app/actions";
import { listarAvisos } from "@/lib/notifications";
import { relativeDate } from "@/lib/design";

export const metadata = { title: "Avisos · Paragon" };

const ICONO: Record<string, string> = {
  platino_cerca: "🏆",
  lanzamiento: "🚀",
  amigo_adelanta: "⚡",
  logros_nuevos: "🧩",
  abandonado: "🕸️",
  resumen_semanal: "🗓️",
};

/**
 * Bandeja de avisos.
 *
 * Los genera el cron al sincronizar (ver `lib/notifications`), no esta
 * pantalla: la idea es enterarte sin entrar. Aquí solo se leen.
 */
export default async function AvisosPage() {
  const session = await auth();
  if (!session?.user) redirect("/entrar");

  const avisos = await listarAvisos(session.user.id);
  const sinLeer = avisos.filter((a) => !a.leido).length;

  return (
    <div className="mx-auto max-w-[760px]">
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="font-heading text-[42px] font-bold uppercase leading-none">Avisos</h1>
        {sinLeer > 0 && (
          <form action={marcarLeidoAction} className="ml-auto">
            <button className="text-[13px] font-semibold text-accent hover:underline">
              Marcar todo como leído
            </button>
          </form>
        )}
      </div>

      <p className="mt-2 text-[15px] text-muted">
        Se generan solos al sincronizar tus cuentas, cada hora.
      </p>

      {avisos.length === 0 ? (
        <p className="mt-8 rounded-xl border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
          Todavía no hay avisos. Aparecerán cuando te quede poco para un platino
          o salga un juego de tu lista de deseados.
        </p>
      ) : (
        <div className="mt-7 space-y-2">
          {avisos.map((a) => {
            const contenido = (
              <>
                <span className="text-xl leading-none">{ICONO[a.type] ?? "•"}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold">{a.title}</span>
                  {a.body && <span className="mt-0.5 block text-[13px] text-muted">{a.body}</span>}
                  <span className="mt-1 block text-[11px] text-muted">
                    {relativeDate(a.createdAt)}
                  </span>
                </span>
                {!a.leido && (
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                    style={{ background: "var(--accent)" }}
                    aria-label="Sin leer"
                  />
                )}
              </>
            );

            const estilo = {
              border: "1px solid var(--border)",
              background: a.leido ? "var(--surface)" : "rgb(var(--accent-rgb) / 0.07)",
            };

            return a.href ? (
              <Link
                key={a.id}
                href={a.href}
                className="flex items-start gap-3.5 rounded-2xl p-4 transition-colors hover:bg-surface-2"
                style={estilo}
              >
                {contenido}
              </Link>
            ) : (
              <div key={a.id} className="flex items-start gap-3.5 rounded-2xl p-4" style={estilo}>
                {contenido}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
