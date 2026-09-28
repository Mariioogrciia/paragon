/**
 * Radar "cara a cara" de /comparar — SVG propio, sin librería.
 *
 * Antes era `recharts` (auditoría de rendimiento, 28 sept 2026): ~95 KB
 * comprimidos de JavaScript solo para este gráfico, que además había que
 * cargar en diferido y sin SSR. Cinco ejes y dos polígonos se dibujan con
 * trigonometría básica; así sale ya pintado en el HTML del servidor.
 */

interface RadarData {
  subject: string;
  A: number;
  B: number;
  fullMark: number;
}

interface RivalryRadarProps {
  data: RadarData[];
  userA: { name: string; color: string };
  userB: { name: string; color: string };
}

const TAM = 400;
const CENTRO = TAM / 2;
const RADIO = 130;
const NIVELES = [0.25, 0.5, 0.75, 1];
// El `viewBox` deja 100 px a cada lado: las etiquetas de los ejes laterales
// ("Volumen (Juegos)") salen del círculo hacia fuera y se cortarían.

/** Punto del eje `i` (de `n`) a una fracción `f` del radio; el primer eje apunta arriba. */
function punto(i: number, n: number, f: number): [number, number] {
  const angulo = -Math.PI / 2 + (2 * Math.PI * i) / n;
  return [CENTRO + Math.cos(angulo) * RADIO * f, CENTRO + Math.sin(angulo) * RADIO * f];
}

const poligono = (puntos: [number, number][]) => puntos.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

export function RivalryRadar({ data, userA, userB }: RivalryRadarProps) {
  const n = data.length;
  const fraccion = (valor: number, total: number) => Math.max(0, Math.min(1, total > 0 ? valor / total : 0));
  const series = [
    { user: userA, clave: "A" as const },
    { user: userB, clave: "B" as const },
  ];

  return (
    <div className="w-full rounded-2xl border border-border bg-surface/50 p-4">
      <svg viewBox={`-100 -5 ${TAM + 200} ${TAM + 10}`} className="mx-auto block h-auto w-full max-w-[560px]" role="img" aria-label={`${userA.name} vs ${userB.name}`}>
        {NIVELES.map((nivel) => (
          <polygon
            key={nivel}
            points={poligono(data.map((_, i) => punto(i, n, nivel)))}
            fill="none"
            stroke="var(--border)"
          />
        ))}
        {data.map((_, i) => {
          const [x, y] = punto(i, n, 1);
          return <line key={i} x1={CENTRO} y1={CENTRO} x2={x} y2={y} stroke="var(--border)" />;
        })}

        {series.map(({ user, clave }) => (
          <g key={clave}>
            <polygon
              points={poligono(data.map((d, i) => punto(i, n, fraccion(d[clave], d.fullMark))))}
              fill={user.color}
              fillOpacity={0.35}
              stroke={user.color}
              strokeWidth={2}
            />
            {data.map((d, i) => {
              const [x, y] = punto(i, n, fraccion(d[clave], d.fullMark));
              return (
                <circle key={i} cx={x} cy={y} r={4} fill={user.color}>
                  <title>{`${user.name} · ${d.subject}: ${Math.round(d[clave])}`}</title>
                </circle>
              );
            })}
          </g>
        ))}

        {data.map((d, i) => {
          const [x, y] = punto(i, n, 1.18);
          const anclaje = Math.abs(x - CENTRO) < 1 ? "middle" : x > CENTRO ? "start" : "end";
          return (
            <text
              key={d.subject}
              x={x}
              y={y}
              textAnchor={anclaje}
              dominantBaseline="middle"
              fill="var(--muted)"
              fontSize={12}
              fontWeight={700}
            >
              {d.subject}
            </text>
          );
        })}
      </svg>

      <div className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm font-bold">
        {series.map(({ user, clave }) => (
          <span key={clave} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm" style={{ background: user.color }} />
            {user.name}
          </span>
        ))}
      </div>
    </div>
  );
}
