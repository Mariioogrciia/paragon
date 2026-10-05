/**
 * Plazas de una sesión de un vistazo: un punto por plaza (lleno = ocupada,
 * hueco = libre) y "2/4". El total cuenta a quien organiza.
 */
export function Plazas({ ocupadas, total, grande = false }: { ocupadas: number; total: number; grande?: boolean }) {
  const punto = grande ? "h-3 w-3" : "h-2 w-2";
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`${ocupadas}/${total}`}>
      {/* Con muchas plazas los puntos no caben en la lista: solo el número. */}
      {(grande || total <= 8) && (
      <span className={`flex gap-1 ${grande ? "flex-wrap" : ""}`} aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`${punto} rounded-full border`}
            style={
              i < ocupadas
                ? { background: "var(--accent)", borderColor: "var(--accent)" }
                : { borderColor: "var(--border)" }
            }
          />
        ))}
      </span>
      )}
      <span className={`font-bold tabular-nums ${grande ? "text-base" : "text-xs"}`}>
        {ocupadas}/{total}
      </span>
    </span>
  );
}
