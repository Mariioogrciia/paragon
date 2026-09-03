/**
 * Distintivo PEGI (clasificación por edades).
 *
 * Los colores son los de la propia clasificación —verde hasta 7, naranja en
 * 12 y 16, rojo en 18— y NO los del tema: un PEGI 18 pintado de verde porque
 * el acento del usuario es verde diría justo lo contrario de lo que significa.
 *
 * El dato sale de IGDB (ver `pegiPorTitulo`), que es la única fuente que lo
 * tiene para todo el catálogo: Steam solo da `required_age`, que es 0 en casi
 * todos los juegos, y PSN no lo da.
 */
export function Pegi({ edad, size = "sm" }: { edad: string; size?: "sm" | "md" }) {
  const color =
    edad === "18" ? "#c0392b" : edad === "3" || edad === "7" ? "#1e824c" : "#d35400";

  const medidas =
    size === "md"
      ? "h-6 min-w-[30px] text-[13px]"
      : "h-5 min-w-[26px] text-[11px]";

  return (
    <span
      className={`inline-flex items-center justify-center rounded-[4px] px-1 font-bold text-white ${medidas}`}
      style={{ background: color }}
      title={`PEGI ${edad}: no recomendado para menores de ${edad} años`}
      aria-label={`PEGI ${edad}`}
    >
      {edad}
    </span>
  );
}
