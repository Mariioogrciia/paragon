"use client";

import { useState } from "react";
import { colorFor } from "@/lib/design";
import { GRADES, type Trophy, type TrophyGrade } from "@/lib/types";

const GRADE_LABEL: Record<TrophyGrade, string> = { platinum: "Platino", gold: "Oro", silver: "Plata", bronze: "Bronce" };

function formatFecha(millis: number): string {
  return new Date(millis).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Vista alternativa a la lista de trofeos: cuándo cayó cada uno (eje X) y lo
 * raro que es (eje Y, el % real de jugadores que lo tiene — 0% arriba del
 * todo, más raro, hasta 100% abajo) — con la foto real del trofeo, no un
 * icono genérico por metal. Solo cuenta lo que tiene `earnedAt` Y
 * `rarityPercent` reales; sin los dos no hay ni fecha ni altura que
 * dibujar, así que esos se quedan fuera en vez de amontonarse en un borde
 * sin significar nada.
 */
export function TrophyTimeline({ trophies }: { trophies: Trophy[] }) {
  const [hoverId, setHoverId] = useState<string | null>(null);

  const puntos = trophies
    .filter((t): t is Trophy & { earnedAt: string; rarityPercent: number } => t.earned && !!t.earnedAt && t.rarityPercent != null)
    .map((t) => ({ ...t, fechaMillis: new Date(t.earnedAt).getTime() }))
    .sort((a, b) => a.fechaMillis - b.fechaMillis);

  if (puntos.length < 2) {
    return (
      <p className="py-8 text-center text-sm text-muted">
        Hacen falta al menos dos trofeos con fecha y rareza registradas para dibujar la gráfica.
      </p>
    );
  }

  const minFecha = puntos[0].fechaMillis;
  const maxFecha = puntos[puntos.length - 1].fechaMillis;
  const rangoFecha = maxFecha - minFecha;
  const xFor = (fecha: number) => (rangoFecha === 0 ? 50 : ((fecha - minFecha) / rangoFecha) * 100);

  // Varios trofeos el mismo día caen exactamente en la misma X — sin esto
  // se apilan uno encima de otro y solo se ve el de más arriba. Se
  // abren en abanico horizontal alrededor de su día real (offsetPx, no
  // cambia la fecha que se muestra ni el eje), ordenados por hora exacta
  // dentro del día. Con muchos el mismo día el abanico se ensancha y ese
  // tramo deja de ser proporcional al tiempo — aceptado a propósito, el
  // caso normal es 2-4 al día.
  const MARKER_SPACING_PX = 28;
  const porDia = new Map<string, typeof puntos>();
  for (const p of puntos) {
    const dia = new Date(p.fechaMillis).toISOString().slice(0, 10);
    const grupo = porDia.get(dia);
    if (grupo) grupo.push(p);
    else porDia.set(dia, [p]);
  }
  const offsetPorId = new Map<string, number>();
  for (const grupo of porDia.values()) {
    grupo.forEach((p, i) => {
      offsetPorId.set(p.id, (i - (grupo.length - 1) / 2) * MARKER_SPACING_PX);
    });
  }

  const gradosPresentes = GRADES.filter((g) => puntos.some((p) => p.grade === g));

  return (
    <div>
      {gradosPresentes.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-3">
          {gradosPresentes.map((g) => (
            <div key={g} className="flex items-center gap-1.5 text-[0.6875rem] font-semibold text-muted">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorFor(g) }} />
              {GRADE_LABEL[g]}
            </div>
          ))}
        </div>
      )}

      <div className="flex" style={{ height: 300 }}>
        <div className="flex shrink-0 flex-col justify-between pr-2 text-right text-[0.625rem] text-muted" style={{ width: 34 }}>
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
        <div className="relative flex-1 border-l" style={{ borderColor: "var(--border)" }}>
          {[0, 25, 50, 75, 100].map((r) => (
            <div
              key={r}
              className="absolute left-0 right-0 h-px"
              style={{ top: `${r}%`, background: "var(--border)", opacity: 0.4 }}
            />
          ))}

          {puntos.map((p) => (
            <div
              key={p.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `calc(${xFor(p.fechaMillis)}% + ${offsetPorId.get(p.id) ?? 0}px)`,
                top: `${p.rarityPercent}%`,
                zIndex: hoverId === p.id ? 20 : 1,
              }}
              onMouseEnter={() => setHoverId(p.id)}
              onMouseLeave={() => setHoverId((id) => (id === p.id ? null : id))}
            >
              <div
                className="h-8 w-8 cursor-pointer overflow-hidden rounded-full border-2 bg-surface-2 transition-transform"
                style={{
                  borderColor: colorFor(p.grade),
                  transform: hoverId === p.id ? "scale(1.4)" : undefined,
                }}
              >
                {p.iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.iconUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center text-[0.5625rem] font-bold"
                    style={{ background: colorFor(p.grade), color: "var(--background)" }}
                  >
                    {p.grade ? GRADE_LABEL[p.grade][0] : "?"}
                  </div>
                )}
              </div>

              {hoverId === p.id && (
                <div
                  className="absolute bottom-full left-1/2 mb-2 w-48 -translate-x-1/2 rounded-lg p-2.5 text-center shadow-lg"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  <p className="text-xs font-bold">{p.name}</p>
                  <p className="mt-0.5 text-[0.6875rem] text-muted">
                    {formatFecha(p.fechaMillis)} · {p.rarityPercent.toFixed(1)}%
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-1.5 flex justify-between text-[0.625rem] text-muted" style={{ paddingLeft: 34 + 8 }}>
        <span>{formatFecha(minFecha)}</span>
        <span>{formatFecha(maxFecha)}</span>
      </div>
    </div>
  );
}
