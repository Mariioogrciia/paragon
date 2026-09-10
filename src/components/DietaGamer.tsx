import type { DietaGamer as Dieta } from "@/lib/dietaGamer";

/**
 * "Dieta Gamer" — ver `dietaGamer()` en lib/dietaGamer.ts para los umbrales.
 * Aviso amistoso, no un bloqueo: solo dice que quizás toca variar antes del
 * siguiente juegazo largo del mismo tipo.
 */
export function DietaGamer({ dieta }: { dieta: Dieta }) {
  return (
    <section
      className="mb-10 rounded-2xl p-5"
      style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
    >
      <h2 className="mb-2 flex items-center gap-2 font-heading text-lg font-bold uppercase tracking-wide">
        🥗 Tu dieta gamer está muy densa
      </h2>
      <p className="text-sm leading-relaxed text-muted">
        Tus últimos 3 juegos terminados —{" "}
        {dieta.juegos.map((j, i) => (
          <span key={j.gameId}>
            <span className="font-semibold text-foreground">{j.titulo}</span>
            {i < dieta.juegos.length - 1 ? ", " : ""}
          </span>
        ))}
        — son todos de <span className="font-semibold text-foreground">{dieta.genero}</span> y suman más de{" "}
        <span className="font-semibold text-foreground">{dieta.horasTotales}h</span>. Prueba algo distinto antes de tu
        próxima gran aventura del mismo tipo — un indie, unas plataformas o un puzle cortito para limpiar el paladar.
      </p>
    </section>
  );
}
