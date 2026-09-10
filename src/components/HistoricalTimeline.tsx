import Link from "next/link";
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
export function HistoricalTimeline({ hitos }: { hitos: HitosHistoricos }) {
  const { primerPlatino, trofeoMasRaro, platinoAnejo, rachaMasLarga } = hitos;

  if (!primerPlatino && !trofeoMasRaro && !platinoAnejo && !rachaMasLarga) return null;

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {primerPlatino && (
        <Hito
          icono="🏆"
          etiqueta="Tu primer platino"
          titulo={primerPlatino.titulo}
          iconUrl={primerPlatino.iconUrl}
          detalle={fechaCorta(primerPlatino.fecha)}
          href={`/juego/${primerPlatino.gameId}`}
        />
      )}

      {trofeoMasRaro && (
        <Hito
          icono="💎"
          etiqueta="Tu trofeo más raro"
          titulo={trofeoMasRaro.nombre}
          iconUrl={trofeoMasRaro.iconUrl}
          detalle={`${trofeoMasRaro.rarityPercent.toFixed(1)}% lo tiene · ${trofeoMasRaro.tituloJuego}`}
          href={`/juego/${trofeoMasRaro.gameId}`}
        />
      )}

      {platinoAnejo && platinoAnejo.dias >= 30 && (
        <Hito
          icono="🍷"
          etiqueta="El platino añejo"
          titulo={platinoAnejo.titulo}
          iconUrl={platinoAnejo.iconUrl}
          detalle={
            platinoAnejo.dias >= 365
              ? `Completado ${Math.floor(platinoAnejo.dias / 365)} años y ${Math.round((platinoAnejo.dias % 365) / 30)} meses después de empezarlo`
              : `Completado ${Math.round(platinoAnejo.dias / 30)} meses después de empezarlo`
          }
          href={`/juego/${platinoAnejo.gameId}`}
        />
      )}

      {rachaMasLarga && rachaMasLarga.dias >= 3 && (
        <Hito
          icono="🔥"
          etiqueta="Tu racha más larga"
          titulo={`${rachaMasLarga.dias} días seguidos`}
          iconUrl={null}
          detalle={`Del ${fechaCorta(rachaMasLarga.desde)} al ${fechaCorta(rachaMasLarga.hasta)}, ganando trofeos sin parar un día`}
        />
      )}
    </div>
  );
}
