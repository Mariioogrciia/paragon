import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { medallaDe } from "@/lib/temporada";

/**
 * Medallas de temporadas ya cerradas (`season_result`), en la cabecera del
 * perfil. Antes solo se veía el chip de la temporada EN CURSO: al cerrarla,
 * la medalla quedaba guardada pero no salía en ningún sitio público.
 */
export async function MedallasTemporada({ historial }: { historial: { temporada: string; nivel: number }[] }) {
  const conMedalla = historial
    .map((h) => ({ ...h, medalla: medallaDe(h.nivel) }))
    .filter((h): h is typeof h & { medalla: NonNullable<typeof h.medalla> } => h.medalla !== null);
  if (conMedalla.length === 0) return null;
  const t = await getTranslations("Shell.Temporada");
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {conMedalla.map((h) => (
        <Link
          key={h.temporada}
          href="/temporada"
          title={`${t(`medallas.${h.medalla.clave}`)} · ${t("nivelN", { n: h.nivel })}`}
          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.6875rem] font-bold transition-colors hover:bg-surface-2"
          style={{ borderColor: h.medalla.color, color: h.medalla.color }}
        >
          {h.medalla.emoji} {h.temporada.replace(/^(\d{4})-(T\d)$/, "$2 $1")}
        </Link>
      ))}
    </div>
  );
}
