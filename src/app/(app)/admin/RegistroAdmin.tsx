import Link from "@/components/Enlace";
import { getTranslations } from "next-intl/server";
import { leerRegistro, type NivelRegistro, type OrigenRegistro } from "@/lib/registro";

/**
 * Admin → Registro (21 oct 2026): lo que apunta lib/registro.ts, con
 * filtros por nivel y origen y "ver más antiguos" por id. El nivel lleva
 * icono y texto, no solo color.
 */

const NIVELES: NivelRegistro[] = ["error", "aviso", "info"];
const ORIGENES: OrigenRegistro[] = ["cron", "sync", "vigilancia", "psn", "admin", "cliente"];
const ICONO: Record<NivelRegistro, string> = { error: "⛔", aviso: "⚠️", info: "ℹ️" };
const COLOR: Record<NivelRegistro, string> = { error: "rgb(239 68 68 / 0.12)", aviso: "rgb(234 179 8 / 0.12)", info: "transparent" };

export async function RegistroAdmin({
  nivel,
  origen,
  antesDe,
  locale,
}: {
  nivel?: NivelRegistro;
  origen?: OrigenRegistro;
  antesDe?: number;
  locale: string;
}) {
  const [t, entradas] = await Promise.all([getTranslations("Admin"), leerRegistro({ nivel, origen, antesDe, limite: 60 })]);
  const href = (cambios: { nivel?: string | null; origen?: string | null; antesDe?: number | null }) => {
    const p = new URLSearchParams({ tab: "registro" });
    const n = cambios.nivel === undefined ? nivel : cambios.nivel;
    const o = cambios.origen === undefined ? origen : cambios.origen;
    if (n) p.set("nivel", n);
    if (o) p.set("origen", o);
    if (cambios.antesDe) p.set("antesDe", String(cambios.antesDe));
    return `/admin?${p.toString()}`;
  };
  const chip = (activo: boolean) =>
    `rounded-full px-3 py-1 text-xs font-bold transition-colors ${activo ? "text-[var(--background)]" : "text-muted hover:text-foreground"}`;
  const estilo = (activo: boolean) => (activo ? { background: "rgb(var(--accent-rgb))" } : { border: "1px solid var(--border)" });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 text-xs font-bold uppercase text-muted">{t("registro.nivel")}</span>
          <Link href={href({ nivel: null })} className={chip(!nivel)} style={estilo(!nivel)}>{t("registro.todos")}</Link>
          {NIVELES.map((n) => (
            <Link key={n} href={href({ nivel: n })} className={chip(nivel === n)} style={estilo(nivel === n)}>
              {ICONO[n]} {t(`registro.niveles.${n}`)}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 text-xs font-bold uppercase text-muted">{t("registro.origen")}</span>
          <Link href={href({ origen: null })} className={chip(!origen)} style={estilo(!origen)}>{t("registro.todos")}</Link>
          {ORIGENES.map((o) => (
            <Link key={o} href={href({ origen: o })} className={chip(origen === o)} style={estilo(origen === o)}>
              {t(`registro.origenes.${o}`)}
            </Link>
          ))}
        </div>
      </div>

      {entradas.length === 0 ? (
        <p className="text-sm text-muted">{t("registro.vacio")}</p>
      ) : (
        <div className="overflow-x-auto rounded-[14px]" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full min-w-[640px] text-sm">
            <tbody>
              {entradas.map((e) => (
                <tr key={e.id} className="border-b border-border align-top last:border-0" style={{ background: COLOR[e.nivel] }}>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs tabular-nums text-muted">
                    {new Date(e.at).toLocaleString(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs font-bold">
                    {ICONO[e.nivel]} {t(`registro.niveles.${e.nivel}`)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted">{t(`registro.origenes.${e.origen}`)}</td>
                  <td className="px-3 py-2.5">
                    <p>{e.mensaje}</p>
                    {e.datos && Object.keys(e.datos).length > 0 && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs text-muted hover:text-foreground">{t("registro.datos")}</summary>
                        <pre className="mt-1 max-w-full overflow-x-auto rounded-lg bg-[var(--surface-2)] p-2 text-[0.6875rem]">{JSON.stringify(e.datos, null, 2)}</pre>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {entradas.length === 60 && (
        <Link href={href({ antesDe: entradas[entradas.length - 1].id })} className="inline-block text-xs font-bold uppercase tracking-wide text-accent hover:underline">
          {t("registro.mas")}
        </Link>
      )}
      <p className="max-w-3xl text-xs text-muted">{t("registro.nota")}</p>
    </div>
  );
}
