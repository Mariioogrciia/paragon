import Link from "next/link";
import { getXboxNews } from "@/lib/xboxNews";
import { NewsFeed } from "@/components/NewsFeed";
import { XboxIcon } from "@/lib/platformIcons";
import { BackButton } from "@/components/BackButton";

export const metadata = {
  title: "Xbox · Descubrir · Paragon",
};

/**
 * Solo noticias, a propósito — Xbox ya sincroniza biblioteca de verdad
 * (ver lib/xbl/client.ts), pero un catálogo tipo /descubrir/steam
 * (tendencias, más jugados...) necesita extender platformHub.ts, que es
 * trabajo aparte, no lo que se pidió aquí.
 */
export default async function DescubrirXboxPage() {
  const noticias = await getXboxNews();

  return (
    <div>
      <BackButton fallbackHref="/descubrir" />
      <div className="mb-6 flex items-center gap-3">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ background: "#107C10" }}
        >
          <XboxIcon size={26} />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted">
            <Link href="/descubrir" className="hover:underline">Descubrir</Link> / Xbox
          </p>
          <h1 className="font-heading text-3xl font-bold uppercase tracking-wide">Xbox</h1>
        </div>
      </div>

      {noticias.length > 0 ? (
        <NewsFeed titulo="Noticias de Xbox" badge="Xbox Wire" items={noticias} />
      ) : (
        <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
          No se han podido cargar las noticias ahora mismo. Prueba más tarde.
        </p>
      )}
    </div>
  );
}
