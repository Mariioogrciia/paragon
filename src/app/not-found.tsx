import Link from "next/link";
import { getTranslations } from "next-intl/server";

/**
 * 404 propio. Sin este archivo, un perfil o juego inexistente
 * (`notFound()` en /u/[handle], /juego/[id]...) dejaba el hueco entre la
 * cabecera y el pie completamente VACÍO: como esas páginas tienen
 * `loading.tsx`, la respuesta ya ha empezado a enviarse cuando se sabe que
 * no existe, y Next no tenía nada que pintar ahí (auditoría, 28 sept 2026).
 */
export default async function NoEncontrado() {
  const t = await getTranslations("Shell.NoEncontrado");

  const enlaces = [
    { href: "/descubrir", label: t("descubrir") },
    { href: "/ejemplo", label: t("ejemplo") },
  ];

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="font-heading text-[clamp(4rem,20vw,7rem)] font-bold leading-none text-[var(--accent-text)]">404</p>
      <h1 className="font-heading mt-4 text-3xl font-bold uppercase">{t("titulo")}</h1>
      <p className="mt-3 max-w-md text-muted">{t("texto")}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg px-6 py-2.5 font-bold text-background transition-all hover:-translate-y-0.5 hover:shadow-lg"
          style={{ background: "var(--accent-grad)" }}
        >
          {t("inicio")}
        </Link>
        {enlaces.map((e) => (
          <Link
            key={e.href}
            href={e.href}
            className="rounded-lg border border-border bg-surface px-5 py-2.5 font-semibold transition-all hover:-translate-y-0.5 hover:border-accent hover:text-[var(--accent-text)]"
          >
            {e.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
