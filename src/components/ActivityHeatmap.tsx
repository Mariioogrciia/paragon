import type { DiaActividad } from "@/lib/profileStats";

/**
 * Mapa de actividad estilo GitHub — un cuadrito por día, más intenso cuanto
 * más trofeos se ganaron ese día. Sale de `earnedAt` (ver el comentario de
 * `lib/profileStats.ts`): es "días con trofeos ganados", el proxy más
 * honesto que hay de "días jugados" — ni PSN ni Steam dan un registro de
 * sesiones real.
 *
 * Semanas de lunes a domingo (convención española, no la de GitHub que
 * empieza en domingo). Sin JS: el detalle de cada día va en `title`, un
 * tooltip nativo del navegador es suficiente para un dato secundario como
 * este.
 */
const DIAS_SEMANA = ["L", "", "X", "", "V", "", ""];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function nivel(trofeos: number): number {
  if (trofeos === 0) return 0;
  if (trofeos <= 2) return 1;
  if (trofeos <= 5) return 2;
  if (trofeos <= 9) return 3;
  return 4;
}

const OPACIDAD_POR_NIVEL = [0, 0.25, 0.45, 0.7, 1];

function fechaLarga(iso: string): string {
  const [anio, mes, dia] = iso.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia)).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export function ActivityHeatmap({ dias }: { dias: DiaActividad[] }) {
  if (dias.length === 0) return null;

  // Relleno de días vacíos al principio para que la primera semana empiece en lunes.
  const primerDia = new Date(`${dias[0].dia}T00:00:00Z`);
  const huecoInicial = (primerDia.getUTCDay() + 6) % 7; // lunes=0 ... domingo=6
  const celdas: (DiaActividad | null)[] = [...Array(huecoInicial).fill(null), ...dias];

  const semanas: (DiaActividad | null)[][] = [];
  for (let i = 0; i < celdas.length; i += 7) semanas.push(celdas.slice(i, i + 7));

  const total = dias.reduce((acc, d) => acc + d.trofeos, 0);

  // Una etiqueta de mes por columna, solo cuando ese mes empieza en esa semana.
  const etiquetasMes: { semana: number; texto: string }[] = [];
  let mesAnterior = -1;
  semanas.forEach((semana, i) => {
    const primerDiaReal = semana.find((d) => d !== null);
    if (!primerDiaReal) return;
    const mes = Number(primerDiaReal.dia.slice(5, 7)) - 1;
    if (mes !== mesAnterior) {
      etiquetasMes.push({ semana: i, texto: MESES[mes] });
      mesAnterior = mes;
    }
  });

  return (
    <div className="overflow-x-auto">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-sm font-semibold">{total} trofeos ganados en los últimos 12 meses</p>
      </div>
      <div className="inline-flex gap-2">
        <div className="flex flex-col gap-[3px] pt-4 text-[10px] font-semibold text-muted">
          {DIAS_SEMANA.map((d, i) => (
            <span key={i} className="flex h-[11px] items-center">{d}</span>
          ))}
        </div>
        <div>
          <div className="relative mb-1 h-3" style={{ width: semanas.length * 14 }}>
            {etiquetasMes.map((m) => (
              <span key={m.semana} className="absolute text-[10px] font-semibold text-muted" style={{ left: m.semana * 14 }}>
                {m.texto}
              </span>
            ))}
          </div>
          <div className="flex gap-[3px]">
            {semanas.map((semana, i) => (
              <div key={i} className="flex flex-col gap-[3px]">
                {semana.map((d, j) =>
                  d ? (
                    <div
                      key={j}
                      title={`${fechaLarga(d.dia)} — ${d.trofeos} ${d.trofeos === 1 ? "trofeo" : "trofeos"}`}
                      className="h-[11px] w-[11px] rounded-[2px]"
                      style={{
                        background: nivel(d.trofeos) === 0 ? "var(--surface-2)" : `rgb(var(--accent-rgb) / ${OPACIDAD_POR_NIVEL[nivel(d.trofeos)]})`,
                      }}
                    />
                  ) : (
                    <div key={j} className="h-[11px] w-[11px]" />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-muted">
        <span>Menos</span>
        {OPACIDAD_POR_NIVEL.map((op, i) => (
          <div key={i} className="h-[11px] w-[11px] rounded-[2px]" style={{ background: op === 0 ? "var(--surface-2)" : `rgb(var(--accent-rgb) / ${op})` }} />
        ))}
        <span>Más</span>
      </div>
    </div>
  );
}
