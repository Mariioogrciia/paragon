import { useTranslations } from "next-intl";

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
const HITOS: { dias: number; key: string }[] = [
  { dias: 0, key: "h0" },
  { dias: 1, key: "h1" },
  { dias: 2, key: "h2" },
  { dias: 3, key: "h3" },
  { dias: 5, key: "h5" },
  { dias: 7, key: "h7" },
  { dias: 10, key: "h10" },
  { dias: 14, key: "h14" },
  { dias: 21, key: "h21" },
  { dias: 30, key: "h30" },
  { dias: 45, key: "h45" },
  { dias: 60, key: "h60" },
  { dias: 90, key: "h90" },
  { dias: 180, key: "h180" },
  { dias: 270, key: "h270" },
  { dias: 365, key: "h365" },
  { dias: 365 * 1.5, key: "h548" },
  { dias: 365 * 2, key: "h730" },
  { dias: 365 * 4, key: "h1460" },
  { dias: 365 * 5, key: "h1825" },
  { dias: 365 * 6, key: "h2190" },
  { dias: 365 * 7, key: "h2555" },
  { dias: 365 * 10, key: "h3650" },
  { dias: 365 * 18, key: "h6570" },
];

function hito(dias: number): string {
  let elegido = HITOS[0];
  for (const h of HITOS) {
    if (dias >= h.dias) elegido = h;
    else break;
  }
  return elegido.key;
}

export function PlaytimeComparison({ horasTotales }: { horasTotales: number }) {
  const t = useTranslations("Analitica.playtimeComparison");
  if (horasTotales === 0) return null;

  const dias = horasTotales / 24;
  const diasRedondeado = Math.round(dias * 10) / 10;

  return (
    <div className="rounded-2xl p-5" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
      <h3 className="mb-1 font-heading text-sm font-bold uppercase tracking-wide">{t("titulo")}</h3>
      <p className="mb-4 text-xs text-muted">
        {t("subtitulo", { horas: horasTotales.toLocaleString("es-ES") })}
      </p>
      <p className="font-heading text-3xl font-bold text-accent">
        {t("dias", { count: diasRedondeado })}
      </p>
      <p className="mt-1 text-sm text-foreground/85">
        {t.rich("loMismoQue", { hito: t(`hitos.${hito(dias)}`), strong: (chunks) => <span className="font-semibold">{chunks}</span> })}
      </p>
    </div>
  );
}
