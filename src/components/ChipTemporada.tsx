import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { medallaDe, nivelDe, temporadaDe } from "@/lib/temporada";
import { puntosUsuarioTemporada } from "@/lib/temporadas";

/** Nivel de la temporada actual en la cabecera del perfil (enlace a /temporada). Nada si aún no ha puntuado. */
export async function ChipTemporada({ userId, className = "mt-2" }: { userId: string; className?: string }) {
  const puntos = await puntosUsuarioTemporada(userId, temporadaDe(new Date())).catch(() => 0);
  const nivel = nivelDe(puntos);
  if (nivel === 0) return null;
  const t = await getTranslations("Shell.Temporada");
  const medalla = medallaDe(nivel);
  return (
    <Link
      href="/temporada"
      className={`${className} inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition-colors hover:border-accent`}
      style={{ borderColor: medalla?.color ?? "var(--border)", color: medalla?.color ?? "var(--muted)" }}
    >
      {medalla?.emoji ?? "🎯"} {t("chip", { n: nivel })}
    </Link>
  );
}
