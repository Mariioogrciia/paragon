import Link from "next/link";
import type { Collection } from "@/lib/collections";
import type { Game } from "@/lib/types";

export function CollectionProgress({ collections, games, handle }: { collections: Collection[]; games: Game[]; handle: string }) {
  const byId = new Map(games.map((game) => [game.id, game]));
  const summaries = collections.map((collection) => {
    const included = collection.gameIds.map((id) => byId.get(id)).filter((game): game is Game => game !== undefined && !game.isWishlist);
    const completed = included.filter((game) => game.progressPercent === 100).length;
    const average = included.length === 0 ? 0 : Math.round(included.reduce((total, game) => total + game.progressPercent, 0) / included.length);
    return { collection, included, completed, average };
  }).filter((summary) => summary.included.length > 0);

  if (summaries.length === 0) return null;

  return (
    <section className="rounded-[18px] border border-border bg-surface p-5">
      <div className="mb-4 flex items-end justify-between gap-3"><div><h2 className="font-heading text-xl font-bold uppercase tracking-wide">Colecciones</h2><p className="mt-1 text-sm text-muted">Progreso agrupado por tus objetivos y sagas.</p></div><Link href="/planificador" className="text-xs font-bold uppercase tracking-wide text-accent hover:underline">Planificar</Link></div>
      <div id="colecciones" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{summaries.map(({ collection, included, completed, average }) => <Link key={collection.id} href={`/u/${handle}#colecciones`} className="rounded-xl border border-border p-3 transition-colors hover:bg-surface-2"><div className="flex items-center justify-between gap-2"><h3 className="truncate text-sm font-bold">{collection.name}</h3><span className="shrink-0 text-xs text-muted">{completed}/{included.length}</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-accent" style={{ width: `${average}%` }} /></div><p className="mt-2 text-xs text-muted">{average}% completado</p></Link>)}</div>
    </section>
  );
}
