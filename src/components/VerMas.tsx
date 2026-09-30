import Link from "next/link";
import { getTranslations } from "next-intl/server";

/**
 * Paginación acumulativa por URL (`?pagina=N` enseña N páginas seguidas):
 * funciona sin JavaScript, se puede compartir y no pierde lo ya visto.
 * `scroll={false}`: al cargar más, la vista se queda donde estaba.
 */
export async function VerMas({ href }: { href: string }) {
  const t = await getTranslations("Shell.Paginacion");
  return (
    <div className="mt-4 flex justify-center">
      <Link
        href={href}
        scroll={false}
        className="rounded-xl border border-border px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-muted transition-all hover:-translate-y-0.5 hover:border-accent hover:text-[var(--accent-text)]"
      >
        {t("verMas")}
      </Link>
    </div>
  );
}

/** Página pedida en `?pagina=` (1 si falta o no es válida; tope para que nadie pida 10.000 filas). */
export function paginaDe(valor: string | string[] | undefined, maximo = 50): number {
  const n = Number(Array.isArray(valor) ? valor[0] : valor);
  return Number.isInteger(n) && n >= 1 ? Math.min(n, maximo) : 1;
}

/** `?pagina=N+1` conservando el resto de parámetros. */
export function hrefPagina(ruta: string, params: Record<string, string | string[] | undefined>, pagina: number): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (typeof v === "string" && k !== "pagina") q.set(k, v);
  q.set("pagina", String(pagina));
  return `${ruta}?${q.toString()}`;
}
