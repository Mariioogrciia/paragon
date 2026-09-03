import type { CommunityRating as Rating } from "@/lib/ratings";

/**
 * Media de valoraciones de la comunidad para un juego.
 *
 * Se enseña el número además de las estrellas: media y número de votos van
 * juntos siempre, porque un 5,0 con un voto no dice lo mismo que un 4,2 con
 * cuarenta, y con estrellas solas no hay forma de distinguirlos.
 */
export function CommunityRating({ rating }: { rating: Rating | null }) {
  if (!rating) {
    return (
      <p className="text-[13px] text-muted">Todavía no lo ha valorado nadie.</p>
    );
  }

  const { average, votes } = rating;

  return (
    <div className="flex items-center gap-2.5">
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((estrella) => {
          // Media estrella cuando la media cae dentro de este punto.
          const llena = average >= estrella - 0.25;
          const media = !llena && average >= estrella - 0.75;

          return (
            <svg
              key={estrella}
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill={llena ? "#f59e0b" : "none"}
              stroke={llena || media ? "#f59e0b" : "var(--muted)"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          );
        })}
      </span>

      <span className="font-heading text-[15px] font-bold">
        {average.toFixed(1).replace(".", ",")}
      </span>
      <span className="text-[13px] text-muted">
        {votes} {votes === 1 ? "valoración" : "valoraciones"}
      </span>
    </div>
  );
}
