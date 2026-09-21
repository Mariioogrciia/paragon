import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { getProfileByHandle, getLibrary } from "@/lib/profiles";
import { trofeosPorMes } from "@/lib/history";
import { actividadPorDia, horasPorJuego, horasTotales, estadisticasAmigos, franjasHorarias, hitosHistoricos } from "@/lib/profileStats";
import { getFeed } from "@/lib/feed";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { HourlyHeatmap } from "@/components/HourlyHeatmap";
import { HistoricalTimeline } from "@/components/HistoricalTimeline";
import { PlatinosAlAlcance } from "@/components/PlatinosAlAlcance";
import { SalonDeLaVerguenza } from "@/components/SalonDeLaVerguenza";
import { platinosAlAlcance, salonDeLaVerguenza, costePorHora, resumenFinanciero, eficienciaPersonal, resumenEficiencia, deudaBacklog } from "@/lib/backlog";
import { CostePorHora } from "@/components/CostePorHora";
import { EficienciaPersonal } from "@/components/EficienciaPersonal";
import { DeudaBacklog } from "@/components/DeudaBacklog";
import { TrophyDnaRadar } from "@/components/TrophyDnaRadar";
import { calcularTrophyDna, calcularEstiloDeCaza } from "@/lib/trophyDna";
import { TrophyMonthChart } from "@/components/StatCharts";
import { PlaytimeBarChart } from "@/components/PlaytimeBarChart";
import { ActivityFeed } from "@/components/ActivityFeed";
import { RecentlyPlayed } from "@/components/RecentlyPlayed";
import { PlaytimeComparison } from "@/components/PlaytimeComparison";
import { FriendsLeaderboard } from "@/components/FriendsLeaderboard";
import { ParagonScoreCard } from "@/components/ParagonScoreCard";
import { getParagonScore } from "@/lib/paragonScore";
import { getParagonLevel } from "@/lib/paragonLevel";
import { CalculadoraNivel } from "@/components/CalculadoraNivel";

/**
 * El cuerpo de las estadísticas completas de un perfil: heatmap de
 * actividad, Paragon Score, horas en perspectiva, gráficas mensuales,
 * jugado recientemente y (solo en tu propio perfil) amigos.
 *
 * Vive aparte de `u/[handle]/estadisticas/page.tsx` porque también se
 * enseña como pestaña dentro de `u/[handle]/page.tsx` — una sola fuente de
 * verdad para las consultas y el layout, en vez de mantener dos copias que
 * se puedan desincronizar. La página de fuera solo añade el `<BackButton>`
 * y el título; aquí, en la pestaña, ya está todo eso puesto por el perfil.
 */
export async function EstadisticasCompletas({ handle }: { handle: string }) {
  const t = await getTranslations("Analitica.estadisticasCompletas");
  const profile = await getProfileByHandle(handle);
  if (!profile) notFound();

  const session = await auth();
  const esMio = session?.user?.id === profile.userId;

  const [dias, meses, horas, horasEnTotal, feed, { games: biblioteca }, amigos, paragonScore, celdasHorarias, hitos] = await Promise.all([
    actividadPorDia(profile.userId),
    trofeosPorMes(profile.userId),
    horasPorJuego(profile.userId, 8),
    horasTotales(profile.userId),
    // La actividad de amigos y el comparador con ellos son información
    // privada de quien la ve (quiénes son sus amigos y qué hacen) — solo se
    // piden, y solo se enseñan, en el propio perfil de quien ha iniciado
    // sesión, nunca mirando el perfil de otra persona.
    esMio ? getFeed(profile.userId) : Promise.resolve([]),
    getLibrary(profile),
    esMio ? estadisticasAmigos(profile.userId) : Promise.resolve([]),
    getParagonScore(profile.userId),
    franjasHorarias(profile.userId),
    hitosHistoricos(profile.userId),
  ]);

  const nivelParagon = esMio ? await getParagonLevel(profile.userId) : null;

  // "Últimas sesiones" no es un dato que exista — ni PSN ni Steam dan un
  // registro de sesiones, solo la última vez que se tocó cada juego
  // (`lastPlayedAt`). Esto es lo más cerca que hay de verdad: los juegos
  // ordenados por esa fecha, no una lista de sesiones inventada.
  const jugadoRecientemente = biblioteca
    .filter((g) => !g.isWishlist && g.lastPlayedAt)
    .sort((a, b) => new Date(b.lastPlayedAt!).getTime() - new Date(a.lastPlayedAt!).getTime())
    .slice(0, 8);

  // Backlog: solo en tu propio perfil — es información que solo le importa
  // (o le da vergüenza) al dueño de la biblioteca, no a quien la visita.
  const alcanzables = esMio ? platinosAlAlcance(biblioteca) : [];
  const verguenza = esMio ? salonDeLaVerguenza(biblioteca) : [];
  const costes = esMio ? costePorHora(biblioteca) : [];
  const finanzas = esMio ? resumenFinanciero(biblioteca) : null;
  const eficiencia = esMio ? eficienciaPersonal(biblioteca) : [];
  const ritmo = esMio ? resumenEficiencia(eficiencia) : null;
  const deuda = esMio ? deudaBacklog(biblioteca) : null;
  const dna = calcularTrophyDna(biblioteca);
  const estiloDeCaza = calcularEstiloDeCaza(biblioteca);

  return (
    <div>
      <ParagonScoreCard score={paragonScore} />

      {esMio && nivelParagon && (
        <div className="mb-8">
          <CalculadoraNivel nivelActual={nivelParagon.level} xpActual={nivelParagon.xp} />
        </div>
      )}

      <section className="mb-8 rounded-2xl p-5" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
        <h2 className="mb-4 font-heading text-lg font-bold uppercase tracking-wide">{t("trophyDna")}</h2>
        <TrophyDnaRadar dna={dna} estiloDeCaza={estiloDeCaza} />
      </section>

      {(hitos.primerTrofeo || hitos.primerPlatino || hitos.trofeoMasRaro || hitos.platinoAnejo || hitos.rachaMasLarga) && (
        <section className="mb-8">
          <h2 className="mb-4 font-heading text-xl font-bold uppercase tracking-wide">{t("lineaDeTiempo")}</h2>
          <HistoricalTimeline hitos={hitos} />
        </section>
      )}

      <section className="mb-8 rounded-2xl p-5" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
        <ActivityHeatmap dias={dias} />
      </section>

      {celdasHorarias.some((c) => c.trofeos > 0) && (
        <section className="mb-8 rounded-2xl p-5" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
          <h2 className="mb-4 font-heading text-lg font-bold uppercase tracking-wide">{t("aQueHorasJuegas")}</h2>
          <HourlyHeatmap celdas={celdasHorarias} />
        </section>
      )}

      <div className="mb-8">
        <PlaytimeComparison horasTotales={horasEnTotal} />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <TrophyMonthChart meses={meses} />
        <PlaytimeBarChart juegos={horas} handle={handle} />
      </div>

      {jugadoRecientemente.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-1 font-heading text-xl font-bold uppercase tracking-wide">{t("jugadoRecientemente")}</h2>
          <p className="mb-4 text-sm text-muted">
            {t("jugadoRecientementeSub")}
          </p>
          <RecentlyPlayed games={jugadoRecientemente} handle={handle} />
        </section>
      )}

      {esMio && alcanzables.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-1 font-heading text-xl font-bold uppercase tracking-wide">{t("platinosAlAlcance")}</h2>
          <p className="mb-4 text-sm text-muted">
            {t("platinosAlAlcanceSub")}
          </p>
          <PlatinosAlAlcance juegos={alcanzables} />
        </section>
      )}

      {esMio && costes.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-1 font-heading text-xl font-bold uppercase tracking-wide">{t("costePorHora")}</h2>
          <p className="mb-4 text-sm text-muted">{t("costePorHoraSub")}</p>
          <CostePorHora juegos={costes} resumen={finanzas!} />
        </section>
      )}

      {esMio && eficiencia.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-1 font-heading text-xl font-bold uppercase tracking-wide">{t("eficienciaDeCaza")}</h2>
          <p className="mb-4 text-sm text-muted">{t("eficienciaDeCazaSub")}</p>
          <EficienciaPersonal juegos={eficiencia} resumen={ritmo!} />
        </section>
      )}

      {esMio && deuda && deuda.juegosContados > 0 && (
        <section className="mb-8">
          <h2 className="mb-1 font-heading text-xl font-bold uppercase tracking-wide">{t("deudaDeBacklog")}</h2>
          <p className="mb-4 text-sm text-muted">{t("deudaDeBacklogSub")}</p>
          <DeudaBacklog deuda={deuda} />
        </section>
      )}

      {esMio && verguenza.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-1 font-heading text-xl font-bold uppercase tracking-wide">{t("salonDeLaVerguenza")}</h2>
          <p className="mb-4 text-sm text-muted">{t("salonDeLaVerguenzaSub")}</p>
          <SalonDeLaVerguenza juegos={verguenza} />
        </section>
      )}

      {esMio && (
        <>
          <section className="mb-8">
            <h2 className="mb-1 font-heading text-xl font-bold uppercase tracking-wide">{t("tuYTusAmigos")}</h2>
            <p className="mb-4 text-sm text-muted">{t("tuYTusAmigosSub")}</p>
            <FriendsLeaderboard personas={amigos} propioUserId={profile.userId} />
          </section>

          <section>
            <h2 className="mb-4 font-heading text-xl font-bold uppercase tracking-wide">{t("actividadDeTusAmigos")}</h2>
            <ActivityFeed activities={feed} currentUserId={session?.user?.id ?? null} />
          </section>
        </>
      )}
    </div>
  );
}
