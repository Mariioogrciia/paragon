import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getProfileByHandle, getLibrary } from "@/lib/profiles";
import { trofeosPorMes } from "@/lib/history";
import { actividadPorDia, horasPorJuego, horasTotales, estadisticasAmigos } from "@/lib/profileStats";
import { getFeed } from "@/lib/feed";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { TrophyMonthChart, PlaytimeBarChart } from "@/components/StatCharts";
import { ActivityFeed } from "@/components/ActivityFeed";
import { RecentlyPlayed } from "@/components/RecentlyPlayed";
import { PlaytimeComparison } from "@/components/PlaytimeComparison";
import { FriendsLeaderboard } from "@/components/FriendsLeaderboard";
import { BackButton } from "@/components/BackButton";
import { ParagonScoreCard } from "@/components/ParagonScoreCard";
import { getParagonScore } from "@/lib/paragonScore";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return { title: `Estadísticas de @${handle} · Paragon` };
}

export default async function EstadisticasPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const profile = await getProfileByHandle(handle);
  if (!profile) notFound();

  const session = await auth();
  const esMio = session?.user?.id === profile.userId;

  const [dias, meses, horas, horasEnTotal, feed, { games: biblioteca }, amigos, paragonScore] = await Promise.all([
    actividadPorDia(profile.userId),
    trofeosPorMes(profile.userId),
    horasPorJuego(profile.userId),
    horasTotales(profile.userId),
    // La actividad de amigos y el comparador con ellos son información
    // privada de quien la ve (quiénes son sus amigos y qué hacen) — solo se
    // piden, y solo se enseñan, en el propio perfil de quien ha iniciado
    // sesión, nunca mirando el perfil de otra persona.
    esMio ? getFeed(profile.userId) : Promise.resolve([]),
    getLibrary(profile),
    esMio ? estadisticasAmigos(profile.userId) : Promise.resolve([]),
    getParagonScore(profile.userId),
  ]);

  // "Últimas sesiones" no es un dato que exista — ni PSN ni Steam dan un
  // registro de sesiones, solo la última vez que se tocó cada juego
  // (`lastPlayedAt`). Esto es lo más cerca que hay de verdad: los juegos
  // ordenados por esa fecha, no una lista de sesiones inventada.
  const jugadoRecientemente = biblioteca
    .filter((g) => !g.isWishlist && g.lastPlayedAt)
    .sort((a, b) => new Date(b.lastPlayedAt!).getTime() - new Date(a.lastPlayedAt!).getTime())
    .slice(0, 8);

  return (
    <div>
      <BackButton fallbackHref={`/u/${handle}`} />
      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-muted">
        <Link href={`/u/${handle}`} className="hover:underline">@{handle}</Link> / Estadísticas
      </p>
      <h1 className="mb-6 font-heading text-3xl font-bold uppercase tracking-wide">Estadísticas</h1>

      <ParagonScoreCard score={paragonScore} />

      <section className="mb-8 rounded-2xl p-5" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
        <ActivityHeatmap dias={dias} />
      </section>

      <div className="mb-8">
        <PlaytimeComparison horasTotales={horasEnTotal} />
      </div>

      <div className="mb-8 grid gap-5 lg:grid-cols-2">
        <TrophyMonthChart meses={meses} />
        <PlaytimeBarChart juegos={horas} />
      </div>

      {jugadoRecientemente.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-1 font-heading text-xl font-bold uppercase tracking-wide">Jugado recientemente</h2>
          <p className="mb-4 text-sm text-muted">
            La última vez que se tocó cada juego — ni PSN ni Steam dan un registro de sesiones, esto es lo más real que hay.
          </p>
          <RecentlyPlayed games={jugadoRecientemente} handle={handle} />
        </section>
      )}

      {esMio && (
        <>
          <section className="mb-8">
            <h2 className="mb-1 font-heading text-xl font-bold uppercase tracking-wide">Tú y tus amigos</h2>
            <p className="mb-4 text-sm text-muted">Un vistazo rápido — cada fila lleva a las estadísticas completas de esa persona.</p>
            <FriendsLeaderboard personas={amigos} propioUserId={profile.userId} />
          </section>

          <section>
            <h2 className="mb-4 font-heading text-xl font-bold uppercase tracking-wide">Actividad de tus amigos</h2>
            <ActivityFeed activities={feed} currentUserId={session?.user?.id ?? null} />
          </section>
        </>
      )}
    </div>
  );
}
