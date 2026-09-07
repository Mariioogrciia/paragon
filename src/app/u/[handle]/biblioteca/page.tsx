import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { BackButton } from "@/components/BackButton";
import { CollectionProgress } from "@/components/CollectionProgress";
import { LibraryGrid } from "@/components/LibraryGrid";
import { ProfileTabsNav } from "@/components/ProfileTabsNav";
import { TrophyCountRow } from "@/components/TrophyCounts";
import { listCollections } from "@/lib/collections";
import { getLibrary, getProfileByHandle } from "@/lib/profiles";
import { summarise } from "@/lib/stats";
import type { GameStatus } from "@/lib/stats";

// Copiada tal cual de `/u/[handle]` al mudar aquí la biblioteca: el panel
// enlaza con `?estado=a-punto` y `?estado=abandonado`, y esos enlaces ahora
// apuntan a esta ruta.
const ESTADOS_VALIDOS = [
  "platinado",
  "completado",
  "en-curso",
  "sin-empezar",
  "deseados",
  "a-punto",
  "abandonado",
];

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return { title: `Biblioteca de @${handle} · Paragon` };
}

/**
 * La biblioteca, en su propia ruta.
 *
 * Antes era una pestaña dentro de `/u/[handle]`, y como `SectionTabs`
 * renderiza todas las pestañas en el servidor (las oculta, no las
 * desmonta), `LibraryGrid` —que es de cliente— recibía los juegos enteros
 * en CADA visita al perfil aunque nadie mirara la biblioteca: 291 juegos,
 * 1.030 KB de HTML por visita. Aquí solo se paga ese precio si de verdad
 * vienes a ver la biblioteca.
 */
export default async function BibliotecaPage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ estado?: string }>;
}) {
  const { handle } = await params;
  const { estado } = await searchParams;
  const initialStatus = ESTADOS_VALIDOS.includes(estado ?? "")
    ? (estado as GameStatus)
    : undefined;

  const profile = await getProfileByHandle(handle);
  if (!profile) notFound();

  const session = await auth();
  const esMio = session?.user?.id === profile.userId;

  const { games } = await getLibrary(profile);
  // Las carpetas son de quien mira, no de quien se mira — mismo criterio
  // que en la ficha de un juego.
  const carpetas = await listCollections(profile.userId);
  const stats = summarise(games);

  return (
    <div>
      <BackButton fallbackHref={`/u/${handle}`} />
      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-muted">
        <Link href={`/u/${handle}`} className="hover:underline">
          @{handle}
        </Link>{" "}
        / Biblioteca
      </p>
      <h1 className="mb-6 font-heading text-3xl font-bold uppercase tracking-wide">Biblioteca</h1>

      <ProfileTabsNav handle={handle} juegos={stats.juegos} />

      <div className="space-y-9">
        <CollectionProgress collections={carpetas} games={games} handle={handle} />
        <TrophyCountRow counts={stats.counts} />
        <section>
          <div className="mb-4 flex flex-wrap items-center gap-3.5">
            <h2 className="font-heading text-2xl font-bold">Juegos</h2>
            <span className="text-[0.8125rem] text-muted">
              {games.length} juegos · del más reciente al más antiguo
            </span>
          </div>

          <LibraryGrid
            games={games}
            handle={handle}
            collections={carpetas}
            esMio={esMio}
            initialStatus={initialStatus}
          />
        </section>
      </div>
    </div>
  );
}
