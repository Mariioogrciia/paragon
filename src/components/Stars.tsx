/**
 * Nota de un juego, en estrellas — de solo lectura.
 *
 * Toda la app puntúa sobre el mismo eje de 1 a 5: `RatingStars` (la
 * biblioteca) escribe directo en `user_game.rating` con esa escala, y la
 * media de la comunidad (`lib/ratings.ts`) es el promedio de esa misma
 * columna. Antes la reseña express metía ahí un número de 1 a 10, así que la
 * media salía mezclando dos escalas distintas sobre el mismo dato — este
 * componente es el que enseña la nota donde antes salía "X/10", y en
 * ReviewEditor el selector ahora también vota en estrellas, no en números.
 */
export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={n <= value ? "#e2b53e" : "none"}
          stroke={n <= value ? "#e2b53e" : "var(--muted)"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </span>
  );
}
