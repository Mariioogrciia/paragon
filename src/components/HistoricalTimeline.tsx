import Link from "next/link";
import { useTranslations } from "next-intl";
import type { HitosHistoricos } from "@/lib/profileStats";

const CARD = { border: "1px solid var(--border)", background: "linear-gradient(var(--surface), var(--background))" };

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

function Hito({
  icono,
  etiqueta,
  titulo,
  iconUrl,
  detalle,
  href,
}: {
  icono: string;
  etiqueta: string;
  titulo: string;
  iconUrl: string | null;
  detalle: string;
  href?: string;
}) {
  const contenido = (
    <div className="flex h-full w-64 shrink-0 flex-col gap-3 rounded-2xl p-4" style={CARD}>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted">
        <span className="text-base leading-none">{icono}</span>
        {etiqueta}
      </div>
      <div className="flex items-center gap-3">
        {iconUrl && <img src={iconUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />}
        <p className="min-w-0 truncate text-sm font-bold" title={titulo}>{titulo}</p>
      </div>
      <p className="mt-auto text-[0.8125rem] text-muted">{detalle}</p>
    </div>
  );

  return href ? (
    <Link href={href} className="transition-transform hover:-translate-y-0.5">{contenido}</Link>
  ) : (
    contenido
  );
}

/**
 * Línea de tiempo de hitos de tu carrera entera de trofeos (no de un año
 * concreto) — scroll horizontal, una tarjeta por hito. Datos de
 * `hitosHistoricos()` en lib/profileStats.ts. Cada hito puede faltar (por
 * ejemplo, sin ningún platino todavía) — se omite la tarjeta, no se enseña
 * vacía.
 */
const ICONO_GRADO: Record<string, string> = {
  bronze: "🥉",
  silver: "🥈",
  gold: "🥇",
  platinum: "🏆",
};

export function HistoricalTimeline({ hitos }: { hitos: HitosHistoricos }) {
  const t = useTranslations("Analitica.historicalTimeline");
  const { primerTrofeo, primerPlatino, trofeoMasRaro, platinoAnejo, rachaMasLarga } = hitos;

  if (!primerTrofeo && !primerPlatino && !trofeoMasRaro && !platinoAnejo && !rachaMasLarga) return null;

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {primerTrofeo && (
        <Hito
          icono={primerTrofeo.grade ? ICONO_GRADO[primerTrofeo.grade] : "🎮"}
          etiqueta={t("tuPrimerTrofeo")}
          titulo={primerTrofeo.nombre}
          iconUrl={primerTrofeo.iconUrl}
          detalle={`${fechaCorta(primerTrofeo.fecha)} · ${primerTrofeo.tituloJuego}`}
          href={`/juego/${primerTrofeo.gameId}`}
        />
      )}

      {primerPlatino && (
        <Hito
          icono="🏆"
          etiqueta={t("tuPrimerPlatino")}
          titulo={primerPlatino.titulo}
          iconUrl={primerPlatino.iconUrl}
          detalle={fechaCorta(primerPlatino.fecha)}
          href={`/juego/${primerPlatino.gameId}`}
        />
      )}

      {trofeoMasRaro && (
        <Hito
          icono="💎"
          etiqueta={t("tuTrofeoMasRaro")}
          titulo={trofeoMasRaro.nombre}
          iconUrl={trofeoMasRaro.iconUrl}
          detalle={t("loTiene", { pct: trofeoMasRaro.rarityPercent.toFixed(1), juego: trofeoMasRaro.tituloJuego })}
          href={`/juego/${trofeoMasRaro.gameId}`}
        />
      )}

      {platinoAnejo && platinoAnejo.dias >= 30 && (
        <Hito
          icono="🍷"
          etiqueta={t("elPlatinoAnejo")}
          titulo={platinoAnejo.titulo}
          iconUrl={platinoAnejo.iconUrl}
          detalle={
            platinoAnejo.dias >= 365
              ? t("completadoAnios", { anios: Math.floor(platinoAnejo.dias / 365), meses: Math.round((platinoAnejo.dias % 365) / 30) })
              : t("completadoMeses", { meses: Math.round(platinoAnejo.dias / 30) })
          }
          href={`/juego/${platinoAnejo.gameId}`}
        />
      )}

      {rachaMasLarga && rachaMasLarga.dias >= 3 && (
        <Hito
          icono="🔥"
          etiqueta={t("tuRachaMasLarga")}
          titulo={t("diasSeguidos", { count: rachaMasLarga.dias })}
          iconUrl={null}
          detalle={t("rachaDetalle", { desde: fechaCorta(rachaMasLarga.desde), hasta: fechaCorta(rachaMasLarga.hasta) })}
        />
      )}
    </div>
  );
}
