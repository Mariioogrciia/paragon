/**
 * Fechas del resumen semanal (lib/resumenSemanal.ts), puras para poder
 * probarlas (tests/semana.test.ts) — sobre todo el cambio de hora.
 */

const ZONA = "Europe/Madrid";

/** Día de la semana (0 = domingo) y hora en Madrid, sea cual sea la zona del servidor. */
function enMadrid(fecha: Date): { dia: number; hora: number; y: number; m: number; d: number } {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: ZONA,
      weekday: "short",
      hour: "numeric",
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    })
      .formatToParts(fecha)
      .map((p) => [p.type, p.value]),
  );
  const dias = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return { dia: dias.indexOf(partes.weekday), hora: Number(partes.hour), y: Number(partes.year), m: Number(partes.month), d: Number(partes.day) };
}

/** Domingo a partir de las 18:00, hora de Madrid. */
export function esMomentoDelResumen(fecha: Date): boolean {
  const { dia, hora } = enMadrid(fecha);
  return dia === 0 && hora >= 18;
}

/** Semana ISO en Madrid, p. ej. "2026-W39" — clave para no repetir el resumen. */
export function claveSemana(fecha: Date): string {
  const { y, m, d } = enMadrid(fecha);
  const dia = new Date(Date.UTC(y, m - 1, d));
  const diaSemana = dia.getUTCDay() || 7; // lunes = 1 ... domingo = 7
  dia.setUTCDate(dia.getUTCDate() + 4 - diaSemana); // jueves de esa semana
  const inicioAnio = new Date(Date.UTC(dia.getUTCFullYear(), 0, 1));
  const semana = Math.ceil(((dia.getTime() - inicioAnio.getTime()) / 86_400_000 + 1) / 7);
  return `${dia.getUTCFullYear()}-W${String(semana).padStart(2, "0")}`;
}
