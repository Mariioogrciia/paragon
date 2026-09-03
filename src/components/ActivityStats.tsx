import type { Game } from "@/lib/types";

function horas(minutos: number): string {
  return `${(minutos / 60).toFixed(minutos >= 600 ? 0 : 1)} h`;
}

export function ActivityStats({ games, now }: { games: Game[]; now: number }) {
  const jugados = games.filter((game) => !game.isWishlist);
  const porPlataforma = new Map<string, number>();
  for (const game of jugados) {
    porPlataforma.set(game.platform, (porPlataforma.get(game.platform) ?? 0) + (game.playtimeMinutes ?? 0));
  }
  const plataformas = [...porPlataforma.entries()].filter(([, minutes]) => minutes > 0).sort((a, b) => b[1] - a[1]);
  const maxHoras = Math.max(...plataformas.map(([, minutes]) => minutes), 1);
  const limite = now - 90 * 86_400_000;
  const abandonados = jugados
    .filter((game) => game.lastPlayedAt && new Date(game.lastPlayedAt).getTime() < limite && game.progressPercent < 100)
    .sort((a, b) => (a.progressPercent - b.progressPercent))
    .slice(0, 5);
  const generos = new Map<string, number>();
  for (const game of jugados) for (const genre of game.genres ?? []) generos.set(genre, (generos.get(genre) ?? 0) + 1);
  const generoTop = [...generos.entries()].sort((a, b) => b[1] - a[1])[0];

  return (
    <section className="rounded-[18px] border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div><h2 className="font-heading text-xl font-bold uppercase tracking-wide">Actividad y estadísticas</h2><p className="mt-1 text-sm text-muted">Una lectura rápida de cómo estás jugando.</p></div>
        {generoTop && <span className="text-xs text-muted">Género principal: <strong className="text-foreground">{generoTop[0]}</strong></span>}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div>
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted">Horas por plataforma</h3>
          {plataformas.length === 0 ? <p className="text-sm text-muted">Todavía no hay horas disponibles.</p> : <div className="space-y-2.5">{plataformas.map(([platform, minutes]) => <div key={platform}><div className="mb-1 flex justify-between text-xs"><span className="font-semibold uppercase">{platform}</span><span className="text-muted">{horas(minutes)}</span></div><div className="h-2 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.round((minutes / maxHoras) * 100)}%` }} /></div></div>)}</div>}
        </div>
        <div>
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted">Sin actividad en 90 días</h3>
          {abandonados.length === 0 ? <p className="text-sm text-muted">No hay juegos abandonados registrados.</p> : <ul className="space-y-2">{abandonados.map((game) => <li key={game.id} className="flex items-center justify-between gap-3 text-sm"><span className="min-w-0 truncate font-semibold">{game.title}</span><span className="shrink-0 text-xs text-muted">{game.progressPercent}%</span></li>)}</ul>}
        </div>
      </div>
    </section>
  );
}
