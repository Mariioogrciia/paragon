import Link from "next/link";
import { StatTile } from "@/components/StatTile";
import type { MesConTrofeos, Rachas, ResumenHistorico } from "@/lib/history";

/**
 * El ritmo de caza a lo largo del tiempo.
 *
 * Una sola serie —trofeos por mes— así que barras y ni leyenda ni segundo
 * color: el título ya dice qué se está midiendo. Los platinos no van como
 * serie aparte para no convertir doce barras en un apilado ilegible; salen en
 * el tooltip, que es donde se consultan los detalles.
 *
 * Los meses a cero se pintan igual: una gráfica que se salta los meses vacíos
 * y pega marzo con julio miente sobre el ritmo, que es justo lo que se viene
 * a mirar aquí.
 */

const MESES_CORTOS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

function etiquetaMes(clave: string): { mes: string; anio: string; esEnero: boolean } {
  const [anio, mes] = clave.split("-");
  const indice = Number(mes) - 1;
  return { mes: MESES_CORTOS[indice] ?? mes, anio, esEnero: indice === 0 };
}

function nombreLargo(clave: string): string {
  const { mes, anio } = etiquetaMes(clave);
  return `${mes} ${anio}`;
}

export function TrophyHistory({
  meses,
  rachas,
  resumen,
  totalPerfil,
}: {
  meses: MesConTrofeos[];
  rachas: Rachas;
  resumen: ResumenHistorico;
  /** Trofeos del perfil, para poder decir sobre cuántos se está calculando. */
  totalPerfil: number;
}) {
  if (resumen.conFecha === 0) {
    return (
      <section
        className="rounded-[18px] p-6"
        style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
      >
        <h2 className="font-heading text-2xl font-bold">Tu ritmo</h2>
        <p className="mt-2 text-[13px] text-muted">
          Todavía no hay ningún trofeo con fecha registrada. Las fechas llegan
          al sincronizar el detalle de cada juego, y eso se va completando solo
          en segundo plano.
        </p>
      </section>
    );
  }

  const maximo = Math.max(...meses.map((m) => m.total), 1);
  const mesPico = meses.reduce((a, b) => (b.total > a.total ? b : a), meses[0]);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-baseline gap-3.5">
        <h2 className="font-heading text-2xl font-bold">Tu ritmo</h2>
        <p className="text-[13px] text-muted">
          Trofeos conseguidos por mes, del último año.
        </p>
        <Link
          href="/ritmo"
          className="ml-auto text-xs font-bold uppercase tracking-wide text-accent hover:underline"
        >
          Ver desglose
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          value={rachas.actual}
          label="Racha actual"
          hint={rachas.actual === 0 ? "Hoy o ayer, ninguno" : "días seguidos"}
        />
        <StatTile value={rachas.mejor} label="Mejor racha" hint="días seguidos" />
        <StatTile value={resumen.esteAnio} label="Este año" />
        {/* El mejor mes lleva a su propio desglose: es la cifra que más pide
            "¿y eso de dónde sale?". */}
        {resumen.mejorMes ? (
          <Link href={`/ritmo?mes=${resumen.mejorMes.mes}`}>
            <StatTile
              value={resumen.mejorMes.total}
              label="Mejor mes"
              hint={nombreLargo(resumen.mejorMes.mes)}
            />
          </Link>
        ) : (
          <StatTile value="—" label="Mejor mes" />
        )}
      </div>

      <div
        className="mt-3 rounded-[18px] p-6"
        style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
      >
        {/* Rejilla: solo el máximo y la base, en gris de fondo. Más líneas
            compiten con las barras, que son lo que se viene a leer. */}
        <div className="relative">
          {/* Una sola línea de rejilla, la del máximo, y su cifra. Más líneas
              compiten con las barras por la atención. */}
          <span className="absolute left-0 top-0 text-[10px] tabular-nums text-muted">
            {maximo}
          </span>
          <div
            className="pointer-events-none absolute inset-x-0 top-[18px] border-t border-dashed"
            style={{ borderColor: "var(--border)" }}
          />

          {/* La altura de la fila tiene que ser definida y las columnas heredarla
              (h-full): con altura automática, el % de cada barra no resuelve
              contra nada y todas salen de 3px. */}
          <div className="flex h-[150px] items-end gap-1.5 border-b border-border pt-[18px]">
            {meses.map((m) => {
              const alto = Math.round((m.total / maximo) * 100);
              const esPico = m.mes === mesPico.mes && m.total > 0;

              return (
                // Cada barra entra en su mes: es la pregunta inmediata al ver
                // un pico ("¿y ese mes qué fue?").
                <Link
                  key={m.mes}
                  href={`/ritmo?mes=${m.mes}`}
                  aria-label={`${nombreLargo(m.mes)}: ${m.total} trofeos. Ver desglose`}
                  className="group relative flex h-full flex-1 flex-col justify-end"
                >
                  {/* Etiqueta directa solo en el mes pico: un número sobre cada
                      barra convierte la gráfica en una tabla mal puesta. */}
                  {esPico && (
                    <span className="mb-1 text-center text-[11px] font-bold tabular-nums">
                      {m.total}
                    </span>
                  )}

                  <span
                    className="block rounded-t-[4px] transition-all duration-300 group-hover:opacity-100 group-hover:shadow-[0_0_15px_rgb(var(--accent-rgb)/0.8)]"
                    style={{
                      height: m.total === 0 ? 2 : `max(3px, ${alto}%)`,
                      background: m.total === 0 ? "var(--border)" : "var(--accent)",
                      opacity: m.total === 0 ? 1 : 0.85,
                    }}
                    aria-hidden="true"
                  />

                  {/* Tooltip al pasar por encima: mes, total y platinos. */}
                  <div
                    className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-xl px-3 py-2 text-[11px] shadow-2xl group-hover:block transition-all duration-300"
                    style={{ 
                      background: "rgba(20, 25, 35, 0.85)", 
                      backdropFilter: "blur(12px)", 
                      WebkitBackdropFilter: "blur(12px)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "white" 
                    }}
                  >
                    <span className="font-bold text-accent-2">{nombreLargo(m.mes)}</span>
                    <span className="opacity-90">
                      {" · "}
                      {m.total} {m.total === 1 ? "trofeo" : "trofeos"}
                      {m.platinos > 0 && ` · ${m.platinos} platino${m.platinos === 1 ? "" : "s"}`}
                    </span>
                  </div>

                </Link>
              );
            })}
          </div>

          <div className="mt-2 flex gap-1.5">
            {meses.map((m) => {
              const { mes, anio, esEnero } = etiquetaMes(m.mes);
              return (
                <span
                  key={m.mes}
                  className="flex-1 text-center text-[10px] text-muted"
                  aria-hidden="true"
                >
                  {mes}
                  {esEnero && <span className="block font-bold">{anio}</span>}
                </span>
              );
            })}
          </div>
        </div>

        <p className="mt-4 text-[11px] text-muted">
          Sobre {resumen.conFecha.toLocaleString("es-ES")} de{" "}
          {totalPerfil.toLocaleString("es-ES")} trofeos: solo cuentan los que
          tienen fecha registrada. Las fechas llegan al sincronizar el detalle de
          cada juego, y eso se completa solo en segundo plano.
        </p>
      </div>
    </section>
  );
}
