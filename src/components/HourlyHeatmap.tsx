import type { CeldaHoraria } from "@/lib/profileStats";

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
// De 3 en 3 horas: 24 columnas por hora exacta eran demasiado finas para
// leerse en móvil, y la caza de trofeos no se decide minuto a minuto.
const FRANJAS = [0, 3, 6, 9, 12, 15, 18, 21];

function nivel(valor: number, max: number): number {
  if (valor === 0 || max === 0) return 0;
  const ratio = valor / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

const OPACIDAD_POR_NIVEL = [0, 0.25, 0.45, 0.7, 1];

/**
 * Cuándo juegas de verdad, cruzando día de la semana y franja horaria — el
 * heatmap anual (`ActivityHeatmap`) ya dice QUÉ DÍAS, este dice A QUÉ HORAS
 * de esos días. Mismos datos de origen (`earnedAt`), agregados distinto
 * (`franjasHorarias` en lib/profileStats.ts).
 */
export function HourlyHeatmap({ celdas }: { celdas: CeldaHoraria[] }) {
  const total = celdas.reduce((acc, c) => acc + c.trofeos, 0);
  if (total === 0) return null;

  // Cada celda de 3h agrupa las horas sueltas que caigan dentro.
  const matriz: number[][] = DIAS.map((_, dow) =>
    FRANJAS.map((inicio) =>
      celdas
        .filter((c) => c.dow === dow && c.hora >= inicio && c.hora < inicio + 3)
        .reduce((acc, c) => acc + c.trofeos, 0),
    ),
  );

  const max = Math.max(...matriz.flat());

  // La franja con más trofeos, para la frase de cabecera.
  let mejorDow = 0;
  let mejorFranja = 0;
  let mejorValor = -1;
  matriz.forEach((fila, dow) =>
    fila.forEach((valor, franja) => {
      if (valor > mejorValor) {
        mejorValor = valor;
        mejorDow = dow;
        mejorFranja = franja;
      }
    }),
  );
  const porcentajeMejor = Math.round((mejorValor / total) * 100);
  const horaInicio = FRANJAS[mejorFranja];
  const horaFin = (horaInicio + 3) % 24;

  return (
    <div className="overflow-x-auto">
      {porcentajeMejor >= 10 && (
        <p className="mb-3 text-sm font-semibold">
          El {porcentajeMejor}% de tus trofeos caen los {DIAS[mejorDow]} entre las{" "}
          {String(horaInicio).padStart(2, "0")}:00 y las {String(horaFin).padStart(2, "0")}:00.
        </p>
      )}
      <div className="inline-flex min-w-full gap-2">
        <div className="flex flex-col gap-[3px] pt-4 text-[0.625rem] font-semibold text-muted">
          {DIAS.map((d) => (
            <span key={d} className="flex h-[18px] items-center">{d}</span>
          ))}
        </div>
        <div className="flex-1">
          <div className="mb-1 flex gap-[3px]">
            {FRANJAS.map((h) => (
              <span key={h} className="flex-1 text-center text-[0.625rem] font-semibold text-muted">
                {String(h).padStart(2, "0")}h
              </span>
            ))}
          </div>
          <div className="flex flex-col gap-[3px]">
            {matriz.map((fila, dow) => (
              <div key={dow} className="flex gap-[3px]">
                {fila.map((valor, franja) => (
                  <div key={franja} className="group/celda relative h-[18px] flex-1">
                    <div
                      className="h-[18px] w-full rounded-[3px]"
                      style={{
                        background: nivel(valor, max) === 0 ? "var(--surface-2)" : `rgb(var(--accent-rgb) / ${OPACIDAD_POR_NIVEL[nivel(valor, max)]})`,
                      }}
                    />
                    {valor > 0 && (
                      <div
                        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-[0.6875rem] font-semibold opacity-0 shadow-lg transition-opacity group-hover/celda:opacity-100"
                        style={{ background: "var(--foreground)", color: "var(--background)" }}
                      >
                        {valor} {valor === 1 ? "trofeo" : "trofeos"} · {DIAS[dow]} {String(FRANJAS[franja]).padStart(2, "0")}h-{String((FRANJAS[franja] + 3) % 24).padStart(2, "0")}h
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
