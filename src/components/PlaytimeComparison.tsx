/**
 * "Si juntaras todas tus horas jugadas seguidas, sin parar, serían X días"
 * — una lectura honesta del dato: `playtimeMinutes` es tiempo TOTAL
 * acumulado, no calendario real vivido jugando (nadie juega 24/7), así que
 * se enseña como el experimento mental que es, no como "llevas X días de tu
 * vida jugando".
 *
 * La comparación es solo de DURACIÓN (cuánto tardaría en pasar ese tiempo
 * en el calendario), no de esfuerzo — por eso "una carrera + un máster" vale
 * aquí aunque estudiar y jugar no se parezcan en nada: los dos tardan ~5
 * años en pasar.
 */
const HITOS: { dias: number; texto: string }[] = [
  { dias: 0, texto: "un ratito, para calentar" },
  { dias: 1, texto: "un vuelo Madrid-Tokio ida y vuelta, con escalas" },
  { dias: 2, texto: "un festival de música de fin de semana" },
  { dias: 3, texto: "un puente de fin de semana largo" },
  { dias: 5, texto: "una semana laboral entera, de lunes a viernes" },
  { dias: 7, texto: "una semana entera de vacaciones" },
  { dias: 10, texto: "un campamento de verano" },
  { dias: 14, texto: "una baja médica de dos semanas" },
  { dias: 21, texto: "sacarte el carné de conducir, de la primera clase al examen" },
  { dias: 30, texto: "un mes completo, de un tirón" },
  { dias: 45, texto: "un curso intensivo de idiomas de verano" },
  { dias: 60, texto: "preparar unas oposiciones cortas" },
  { dias: 90, texto: "un trimestre escolar entero" },
  { dias: 180, texto: "medio curso escolar" },
  { dias: 270, texto: "un curso escolar completo, de septiembre a junio" },
  { dias: 365, texto: "un año entero, de enero a enero" },
  { dias: 365 * 1.5, texto: "un ciclo formativo de grado medio" },
  { dias: 365 * 2, texto: "un ciclo formativo de grado superior" },
  { dias: 365 * 4, texto: "una carrera universitaria completa" },
  { dias: 365 * 5, texto: "una carrera universitaria y un máster" },
  { dias: 365 * 6, texto: "la carrera de Medicina, con el MIR casi incluido" },
  { dias: 365 * 7, texto: "toda la ESO y el Bachillerato juntos" },
  { dias: 365 * 10, texto: "una década — literal" },
  { dias: 365 * 18, texto: "toda tu infancia y adolescencia, hasta cumplir la mayoría de edad" },
];

function hito(dias: number): string {
  let elegido = HITOS[0];
  for (const h of HITOS) {
    if (dias >= h.dias) elegido = h;
    else break;
  }
  return elegido.texto;
}

export function PlaytimeComparison({ horasTotales }: { horasTotales: number }) {
  if (horasTotales === 0) return null;

  const dias = horasTotales / 24;
  const diasRedondeado = Math.round(dias * 10) / 10;

  return (
    <div className="rounded-2xl p-5" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
      <h3 className="mb-1 font-heading text-sm font-bold uppercase tracking-wide">Horas jugadas, en perspectiva</h3>
      <p className="mb-4 text-xs text-muted">
        Si juntaras las {horasTotales.toLocaleString("es-ES")} horas registradas y las jugaras seguidas, sin dormir, serían...
      </p>
      <p className="font-heading text-3xl font-bold text-accent">
        {diasRedondeado.toLocaleString("es-ES")} {diasRedondeado === 1 ? "día" : "días"}
      </p>
      <p className="mt-1 text-sm text-foreground/85">
        Lo mismo que <span className="font-semibold">{hito(dias)}</span>.
      </p>
    </div>
  );
}
