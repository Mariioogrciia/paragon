import type { TrophyDna } from "@/lib/trophyDna";

const TAMANO = 300;
const CENTRO = TAMANO / 2;
const RADIO = 105;
const ANILLOS = [0.25, 0.5, 0.75, 1];

function punto(indice: number, total: number, radio: number): [number, number] {
  // Empieza arriba (-90°) y gira en sentido horario, como un reloj.
  const angulo = (Math.PI * 2 * indice) / total - Math.PI / 2;
  return [CENTRO + radio * Math.cos(angulo), CENTRO + radio * Math.sin(angulo)];
}

function poligono(puntos: [number, number][]): string {
  return puntos.map((p) => p.join(",")).join(" ");
}

/**
 * Radar de Trophy DNA — un eje por categoría (`lib/trophyDna.ts`), valores
 * ya normalizados 0-100. SVG a mano, sin librería de gráficos: son 7 puntos
 * fijos, no vale la pena la dependencia por esto.
 */
export function TrophyDnaRadar({ dna }: { dna: TrophyDna }) {
  const n = dna.ejes.length;
  if (n === 0 || dna.ejes.every((e) => e.trofeos === 0)) {
    return (
      <p className="text-sm text-muted">
        Todavía no hay suficientes trofeos con género conocido para dibujar tu Trophy DNA.
      </p>
    );
  }

  const puntosValor = dna.ejes.map((e, i) => punto(i, n, (e.valor / 100) * RADIO));

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-8">
      <svg viewBox={`0 0 ${TAMANO} ${TAMANO}`} className="w-full max-w-[300px] shrink-0">
        {/* Anillos de fondo, del 25% al 100%. */}
        {ANILLOS.map((r) => (
          <polygon
            key={r}
            points={poligono(Array.from({ length: n }, (_, i) => punto(i, n, r * RADIO)))}
            fill="none"
            stroke="var(--border)"
            strokeWidth={1}
          />
        ))}

        {/* Un radio por eje. */}
        {dna.ejes.map((_, i) => {
          const [x, y] = punto(i, n, RADIO);
          return <line key={i} x1={CENTRO} y1={CENTRO} x2={x} y2={y} stroke="var(--border)" strokeWidth={1} />;
        })}

        {/* La forma con los valores de verdad. */}
        <polygon points={poligono(puntosValor)} fill="rgb(var(--accent-rgb) / 0.25)" stroke="var(--accent)" strokeWidth={2} />
        {puntosValor.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={3} fill="var(--accent)" />
        ))}

        {/* Etiquetas, un poco más lejos que el anillo exterior. */}
        {dna.ejes.map((e, i) => {
          const [x, y] = punto(i, n, RADIO + 22);
          return (
            <text
              key={e.key}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-foreground text-[11px] font-bold uppercase tracking-wide"
            >
              {e.label}
            </text>
          );
        })}
      </svg>

      <div className="flex flex-1 flex-col gap-2">
        {dna.arquetipo && (
          <p className="mb-1">
            <span className="text-xs font-bold uppercase tracking-widest text-muted">Tu arquetipo</span>
            <span className="block font-heading text-xl font-bold uppercase tracking-wide">{dna.arquetipo}</span>
          </p>
        )}
        {[...dna.ejes]
          .sort((a, b) => b.trofeos - a.trofeos)
          .filter((e) => e.trofeos > 0)
          .map((e) => (
            <div key={e.key} className="flex items-center gap-2 text-xs">
              <span className="w-20 shrink-0 font-semibold text-muted">{e.label}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full" style={{ width: `${e.valor}%`, background: "var(--accent-grad)" }} />
              </div>
              <span className="w-16 shrink-0 text-right font-bold tabular-nums text-muted">{e.trofeos} trofeos</span>
            </div>
          ))}
      </div>
    </div>
  );
}
