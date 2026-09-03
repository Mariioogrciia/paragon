import Link from "next/link";
import { redirect } from "next/navigation";
import { TiltCard } from "@/components/TiltCard";
import { auth } from "@/auth";
import { StatTile } from "@/components/StatTile";
import { TrophyCountRow } from "@/components/TrophyCounts";
import { TrophyIcon, TrophyTile } from "@/components/TrophyIcon";
import { coverGradient } from "@/lib/design";
import { getLibrary, getProfileByUserId, getGlobalStats } from "@/lib/profiles";
import { gameProgress, summarise } from "@/lib/stats";
import { ActivityFeed } from "@/components/ActivityFeed";
import { getFeed } from "@/lib/feed";
import { UpcomingGames } from "@/components/UpcomingGames";
import { TrophyHistory } from "@/components/TrophyHistory";
import { rachas, resumenHistorico, trofeosPorMes } from "@/lib/history";
import { FAQSection } from "@/components/FAQ";
import { getWishlistIgdbIds } from "@/lib/manualGames";
import { getWeeklyMissions } from "@/lib/missions";
import { WeeklyMissions } from "@/components/WeeklyMissions";
import { ActivityStats } from "@/components/ActivityStats";
import { getTrophyRecommendations } from "@/lib/recommendations";
import { TrophyRecommendations } from "@/components/TrophyRecommendations";
import { paragonProgress } from "@/lib/level";

const GRADE_ACCENT = {
  platinum: "#9fd4ec",
  gold: "#e2b53e",
  silver: "#b9c2cc",
  bronze: "#c07b4a",
} as const;

const SAMPLE_NEXT = [
  { name: "Maestro de las artes marciales", rarity: "18,4%", grade: "gold" as const },
  { name: "Coleccionista de hechizos", rarity: "31,7%", grade: "silver" as const },
  { name: "Portador de la Gran Runa", rarity: "48,9%", grade: "bronze" as const },
];

const SAMPLE_SHELF = [
  { title: "Elden Ring", pct: 74, ratio: "32/42", cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg" },
  { title: "Bloodborne", pct: 100, ratio: "40/40", cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/cob99l.jpg" },
  { title: "God of War Ragnarök", pct: 100, ratio: "36/36", cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/coba3d.jpg" },
  { title: "Returnal", pct: 41, ratio: "12/31", cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co3wc1.jpg" },
  { title: "Hollow Knight", pct: 63, ratio: "39/63", cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/cobfzp.jpg" },
  { title: "Ghost of Tsushima", pct: 100, ratio: "55/55", cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2crj.jpg" },
];

const FEATURES = [
  {
    num: "01",
    title: "Qué te falta, no qué tienes",
    body: "Cada juego se ordena por los trofeos que te quedan, con el que más gente consigue arriba. El platino va al final: es la consecuencia, no la tarea.",
  },
  {
    num: "02",
    title: "Amigos, uno a uno o en grupo",
    body: "Solo los juegos que tenéis en común, barra contra barra. Compara con un amigo o con varios a la vez, como un clan.",
  },
  {
    num: "03",
    title: "Sin credenciales de Sony",
    body: "Escribes tu ID público de PlayStation y ya está. Nadie entrega contraseñas ni tokens, y nosotros no guardamos secretos de nadie.",
  },
  {
    num: "04",
    title: "El Wrap, con ranking detrás",
    body: "Tu género más jugado, tu juego más exprimido, tus trofeos del año — y cada uno lleva al ranking entero, con filtro de fecha.",
  },
  {
    num: "05",
    title: "Dificultad, con dos ojos",
    body: "La rareza real del platino y lo que opina quien ya se lo pasó, una al lado de la otra. Ninguna de las dos miente sola.",
  },
  {
    num: "06",
    title: "Avisos que no tienes que ir a buscar",
    body: "Te queda poco para un platino, un juego se quedó parado, salió una expansión con trofeos nuevos — el cron te avisa sin que entres a mirar.",
  },
  {
    num: "07",
    title: "Modo enfoque",
    body: "Pantalla completa con los trofeos más a mano, botones grandes y guía en vídeo. Para cuando ya sabes lo que vas a platinar hoy.",
  },
  {
    num: "08",
    title: "Nivel Paragon y ligas",
    body: "XP por cada trofeo y por completar juegos, insignias por hitos, y una liga mensual que arranca de cero cada mes para todo el mundo.",
  },
];

async function Landing() {
  const globalStats = await getGlobalStats();

  return (
    <div>
      <section className="grid items-center gap-14 py-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <span
            className="inline-flex items-center gap-2.5 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em]"
            style={{ background: "rgb(var(--accent-rgb) / 0.1)", border: "1px solid rgb(var(--accent-rgb) / 0.28)", color: "var(--accent-text)" }}
          >
            <span className="h-[7px] w-[7px] rounded-full bg-good" style={{ boxShadow: "0 0 10px #4ec98a" }} />
            Rastreador de trofeos de PlayStation
          </span>

          <h1 className="font-heading mt-5 text-[74px] font-bold uppercase leading-[0.98] tracking-[-0.02em]">
            El siguiente platino
            <br />
            <span className="text-gradient">no se espera.</span>
          </h1>

          <p className="mt-6 max-w-[540px] text-lg leading-relaxed text-muted">
            Conecta tus cuentas y Paragon te dice exactamente qué trofeo o logro
            tienes más a mano, cuánto te separa del 100% y quién
            de tus rivales va por delante.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/entrar"
              className="rounded-xl px-6 py-4 text-[15px] font-bold text-background transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_40px_rgb(var(--accent-rgb) / 0.6)]"
              style={{ background: "var(--accent-grad)", boxShadow: "0 12px 34px rgb(var(--accent-rgb) / 0.3)" }}
            >
              Empezar la caza
            </Link>
            <Link
              href="/ejemplo"
              className="rounded-xl px-[22px] py-4 text-[15px] font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)]"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "#dbe5f2" }}
            >
              Ver un perfil de ejemplo
            </Link>
          </div>

          <p className="mt-[18px] text-[13px] text-muted">
            Solo tu ID público de PlayStation. Ni contraseñas, ni tokens, ni
            permisos de Sony.
          </p>
        </div>

        <div
          className="relative rounded-[20px] p-[26px]"
          style={{ border: "1px solid #232c3d", background: "linear-gradient(#141b28, #0f141d)", boxShadow: "0 30px 80px rgba(0, 0, 0, 0.5)" }}
        >
          <div className="flex items-center gap-3.5">
            <span
              className="flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-2xl"
              style={{ background: "linear-gradient(155deg, #cfeaf7, #6fb6d8 55%, #2b5f7d)", boxShadow: "0 0 34px rgba(159, 212, 236, 0.4)" }}
            >
              <TrophyIcon grade="platinum" size={34} />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Platino más cercano</p>
              <p className="font-heading mt-1 text-[22px] font-bold">Elden Ring</p>
            </div>
          </div>

          <div className="mt-[22px] flex items-end gap-3">
            <span className="font-heading text-[68px] font-bold leading-[0.85] text-platinum">10</span>
            <span className="pb-2 text-[13px] font-semibold text-muted">
              trofeos
              <br />
              para el platino
            </span>
          </div>

          <div className="mt-[18px] h-2.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full" style={{ width: "74%", background: "var(--accent-grad-h)" }} />
          </div>
          <div className="mt-2.5 flex justify-between text-xs text-muted">
            <span>32 / 42 conseguidos</span>
            <span className="font-bold" style={{ color: "var(--accent-text)" }}>74%</span>
          </div>

          <ul className="mt-6 space-y-2">
            {SAMPLE_NEXT.map((t) => (
              <li
                key={t.name}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                style={{ background: "#121824", border: "1px solid #1e2634" }}
              >
                <TrophyTile grade={t.grade} size={30} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{t.name}</span>
                <span className="shrink-0 text-xs font-bold" style={{ color: GRADE_ACCENT[t.grade] }}>
                  {t.rarity}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 pt-2 lg:grid-cols-4">
        <div className="rounded-2xl p-[22px] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgb(var(--accent-rgb) / 0.15)]" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
          <p className="font-heading text-4xl font-bold leading-none text-platinum">{globalStats.platinos > 0 ? globalStats.platinos : "87"}</p>
          <p className="mt-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Platinos del grupo</p>
        </div>
        <div className="rounded-2xl p-[22px] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(255,255,255,0.1)]" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
          <p className="font-heading text-4xl font-bold leading-none">{globalStats.trofeos > 0 ? globalStats.trofeos.toLocaleString("es-ES") : "4.312"}</p>
          <p className="mt-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Trofeos contados</p>
        </div>
        <div className="rounded-2xl p-[22px] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(255,255,255,0.1)]" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
          <p className="font-heading text-4xl font-bold leading-none">{globalStats.juegos > 0 ? globalStats.juegos.toLocaleString("es-ES") : "214"}</p>
          <p className="mt-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Juegos rastreados</p>
        </div>
        <div className="rounded-2xl p-[22px] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(255,255,255,0.1)]" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
          <p className="font-heading text-4xl font-bold leading-none">{globalStats.completadoMedio > 0 ? `${globalStats.completadoMedio}%` : "68%"}</p>
          <p className="mt-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Completado medio</p>
        </div>
      </section>

      <section id="biblioteca" className="pt-[72px]">
        <h2 className="font-heading text-[34px] font-bold uppercase leading-tight tracking-[-0.01em]">
          Tu biblioteca, ordenada por lo que te falta
        </h2>
        <p className="mb-6 mt-2 max-w-[620px] text-base text-muted">
          Cada juego con su progreso real, su estado y los trofeos que
          quedan. Sin abrir la consola.
        </p>

        <div className="relative -mx-4 overflow-hidden px-4 sm:mx-0 sm:px-0">
          <div className="flex w-max gap-4 animate-marquee hover:[animation-play-state:paused]">
            {[...SAMPLE_SHELF, ...SAMPLE_SHELF, ...SAMPLE_SHELF].map((g, i) => (
              <TiltCard
                key={`${g.title}-${i}`}
                href="#biblioteca"
                className="group relative w-[160px] shrink-0 cursor-pointer overflow-hidden rounded-[20px] transition-all duration-300 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] sm:w-[220px]"
                style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
              >
                <div
                  className="relative flex aspect-[3/4] items-end p-4 bg-cover bg-center"
                  style={{ backgroundImage: `url(${g.cover})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0d13] via-[#0a0d13]/40 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-100" />
                  <p
                    className="font-heading relative z-10 translate-y-2 text-[15px] font-bold leading-tight text-white transition-transform duration-300 group-hover:translate-y-0 sm:text-[17px]"
                    style={{ textShadow: "0 2px 16px rgba(0, 0, 0, 0.9)" }}
                  >
                    {g.title}
                  </p>
                </div>
                <div className="relative z-10 bg-[var(--surface)] p-4 pt-1">
                  <div className="h-[5px] overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${g.pct}%`, background: "var(--accent-grad-h)" }}
                    />
                  </div>
                  <div className="mt-2.5 flex justify-between text-[12px] font-medium text-muted">
                    <span className="font-bold" style={{ color: "var(--accent-text)" }}>{g.pct}%</span>
                    <span>{g.ratio}</span>
                  </div>
                </div>
              </TiltCard>
            ))}
          </div>
          {/* Sombra lateral para difuminar los bordes del marquee */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent" />
        </div>

        <div className="mt-[72px]">
          <h2 className="font-heading text-[30px] font-bold uppercase leading-tight tracking-[-0.01em] text-center mb-8">
            Cómo funciona
          </h2>
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div
                key={f.num}
                className="rounded-[18px] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgb(var(--accent-rgb) / 0.08)]"
                style={{ border: "1px solid var(--border)", background: "linear-gradient(var(--surface), var(--background))" }}
              >
                <span
                  className="font-heading inline-flex h-[30px] w-[30px] items-center justify-center rounded-[9px] text-[13px] font-bold"
                  style={{ background: "rgb(var(--accent-rgb) / 0.12)", border: "1px solid rgb(var(--accent-rgb) / 0.3)", color: "var(--accent-text)" }}
                >
                  {f.num}
                </span>
                <h3 className="font-heading mt-4 text-[17px] font-bold leading-tight">{f.title}</h3>
                <p className="mt-2.5 text-[13px] leading-relaxed text-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FAQSection />

      <section className="py-[72px]">
        <div
          className="relative overflow-hidden rounded-[24px] p-12 sm:p-16"
          style={{
            border: "1px solid #26364d",
            background:
              "radial-gradient(600px 300px at 20% 0%, rgb(var(--accent-rgb) / 0.22), transparent 70%), linear-gradient(160deg, #101a2b, #0b0f17)",
          }}
        >
          <h2 className="font-heading max-w-[640px] text-[52px] font-bold uppercase leading-none tracking-[-0.02em]">
            Nadie platina por casualidad.
          </h2>
          <div className="mt-[30px] flex flex-wrap items-center gap-[18px]">
            <Link
              href="/entrar"
              className="rounded-xl px-[26px] py-4 text-[15px] font-bold text-background transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_40px_rgb(var(--accent-rgb) / 0.6)]"
              style={{ background: "var(--accent-grad)", boxShadow: "0 14px 40px rgb(var(--accent-rgb) / 0.35)" }}
            >
              Conectar mi cuenta
            </Link>
            <span className="text-sm text-muted">Gratis. Solo necesitas vincular tus plataformas.</span>
          </div>
        </div>
      </section>
    </div>
  );
}

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) return <Landing />;

  const profile = await getProfileByUserId(session.user.id);
  if (!profile?.handle || profile.accounts.length === 0) redirect("/bienvenida");

  const { player, games } = await getLibrary(profile);
  const stats = summarise(games);
  const nivelParagon = paragonProgress(games);

  const recientes = games.filter(g => !g.isWishlist).slice(0, 6);

  const [mesesHistorico, rachasUsuario, resumen, wishlistIds, misiones, recomendaciones] = await Promise.all([
    trofeosPorMes(session.user.id),
    rachas(session.user.id),
    resumenHistorico(session.user.id),
    getWishlistIgdbIds(session.user.id),
    getWeeklyMissions(session.user.id),
    getTrophyRecommendations(session.user.id),
  ]);

  const nearPlatinum = games
    .map((g) => ({ game: g, progress: gameProgress(g) }))
    .filter((g) => g.progress.hasPlatinum && !g.progress.platinumEarned)
    .sort((a, b) => a.progress.total - a.progress.earned - (b.progress.total - b.progress.earned))
    .slice(0, 3);

  // Lo contrario de "a un paso": empezados y parados hace más de un año
  // (mismo umbral que el filtro "Abandonados" de la biblioteca). Sin esto,
  // solo se ve en el panel lo que va bien.
  const abandonados = games
    .map((g) => ({ game: g, progress: gameProgress(g) }))
    .filter((g) => g.progress.status === "abandonado")
    .sort((a, b) => new Date(a.game.lastPlayedAt ?? 0).getTime() - new Date(b.game.lastPlayedAt ?? 0).getTime())
    .slice(0, 4);

  const now = new Date().getTime();

  return (
    <div className="space-y-9">
      <div className="flex flex-wrap items-end gap-6">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted">
            <span className="h-[7px] w-[7px] rounded-full bg-good" style={{ boxShadow: "0 0 10px #4ec98a" }} />
            {player.accounts.map((a) => a.username).join(" · ")}
            {` · nivel Paragon ${nivelParagon.level}`}
          </p>
          <h1 className="font-heading text-[42px] font-bold uppercase leading-none tracking-tight">
            Hola, {player.name}
          </h1>
        </div>

        <Link
          href={`/u/${profile.handle}`}
          className="ml-auto rounded-[10px] px-4 py-2.5 text-[13px] font-semibold"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--accent-text)" }}
        >
          Ver mi perfil completo →
        </Link>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div
          className="relative overflow-hidden rounded-[20px] p-6"
          style={{
            border: "1px solid var(--border)",
            background:
              "radial-gradient(400px 200px at 80% 0%, rgba(159, 212, 236, 0.22), transparent 70%), linear-gradient(165deg, #14202c, #0d131c)",
          }}
        >
          <div className="flex items-center gap-2.5 text-platinum">
            <TrophyIcon grade="platinum" size={22} />
            <p className="text-[11px] font-bold uppercase tracking-[0.14em]">Platinos</p>
          </div>
          <p
            className="font-heading mt-2.5 text-[96px] font-bold leading-[0.85]"
            style={{ color: "#dff0f8", textShadow: "0 0 40px rgba(159, 212, 236, 0.35)" }}
          >
            {stats.platinos}
          </p>
        </div>

        <StatTile value={stats.trofeos} label="Trofeos" />
        <StatTile value={stats.juegos} label="Juegos" />
        <StatTile value={`${stats.completadoMedio}%`} label="Completado medio" />
      </div>

      <TrophyCountRow
        counts={stats.counts}
        summary={`${stats.trofeos.toLocaleString("es-ES")} trofeos en ${stats.juegos} juegos`}
      />

      <TrophyHistory
        meses={mesesHistorico}
        rachas={rachasUsuario}
        resumen={resumen}
        totalPerfil={stats.trofeos}
      />

      <WeeklyMissions missions={misiones} />
      <ActivityStats games={games} now={now} />
      <TrophyRecommendations recommendations={recomendaciones} handle={profile.handle} showcaseTrophies={profile.showcaseTrophies ?? []} />

      {nearPlatinum.length > 0 && (
        <section>
          <div className="mb-4 flex flex-wrap items-baseline gap-3.5">
            <h2 className="font-heading text-2xl font-bold">A un paso del platino</h2>
            <p className="text-[13px] text-muted">
              Lo que menos te queda, ordenado por trofeos pendientes.
            </p>
            <Link
              href={`/u/${profile.handle}?estado=a-punto`}
              className="ml-auto text-xs font-bold uppercase tracking-wide text-accent hover:underline"
            >
              Ver todos →
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {nearPlatinum.map(({ game, progress }) => (
              <TiltCard
                key={game.id}
                href={`/u/${profile.handle}/${game.id}`}
                className="group relative block overflow-hidden rounded-[20px] transition-all duration-300 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)]"
                style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
              >
                <div className="relative flex aspect-[16/9] items-end p-4 overflow-hidden">
                  <div 
                    className="absolute inset-[-15%] bg-cover bg-center blur-2xl opacity-50"
                    style={game.iconUrl ? { backgroundImage: `url(${game.iconUrl})` } : { background: coverGradient(game.id) }} 
                  />
                  {game.iconUrl && (
                    <div 
                      className="absolute inset-0 bg-contain bg-no-repeat bg-center opacity-90 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ backgroundImage: `url(${game.iconUrl})`, margin: '5% 15% 25% 15%' }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0d13] via-[#0a0d13]/60 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-100" />
                  <p
                    className="font-heading relative z-10 translate-y-2 text-xl font-bold text-white transition-transform duration-300 group-hover:translate-y-0"
                    style={{ textShadow: "0 2px 14px rgba(0, 0, 0, 0.9)" }}
                  >
                    {game.title}
                  </p>
                </div>
                <div className="relative z-10 bg-[var(--surface)] p-[18px]">
                  <div className="flex items-end gap-2.5">
                    <p className="font-heading text-4xl font-bold leading-[0.9] text-platinum">
                      {progress.total - progress.earned}
                    </p>
                    <p className="pb-1 text-[11px] font-bold uppercase leading-tight tracking-[0.1em] text-muted">
                      trofeos para
                      <br />
                      el platino
                    </p>
                  </div>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${progress.percent}%`, background: "var(--accent-grad-h)" }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-muted">
                    <span className="font-bold" style={{ color: "var(--accent-text)" }}>{progress.percent}%</span>
                    <span>{progress.earned}/{progress.total}</span>
                  </div>
                </div>
              </TiltCard>
            ))}
          </div>
        </section>
      )}

      {abandonados.length > 0 && (
        <section>
          <div className="mb-4 flex flex-wrap items-baseline gap-3.5">
            <h2 className="font-heading text-2xl font-bold">Juegos parados</h2>
            <p className="text-[13px] text-muted">
              Empezados y sin tocar hace más de un año.
            </p>
            <Link
              href={`/u/${profile.handle}?estado=abandonado`}
              className="ml-auto text-xs font-bold uppercase tracking-wide text-accent hover:underline"
            >
              Ver todos →
            </Link>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {abandonados.map(({ game, progress }) => (
              <Link
                key={game.id}
                href={`/u/${profile.handle}/${game.id}`}
                className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-surface-2"
                style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
              >
                <span
                  className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-cover bg-center"
                  style={{ background: game.iconUrl ? `url(${game.iconUrl}) center/cover` : coverGradient(game.id) }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold" title={game.title}>
                    {game.title}
                  </p>
                  <p className="text-[11px] text-muted">{progress.percent}% · sin tocar hace tiempo</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* En la portada, que es donde se aterriza: en el perfil quedaba después
          de una biblioteca de cientos de juegos con carga progresiva. */}
      <UpcomingGames wishlistedIgdbIds={wishlistIds} />

      <section>
        <div className="mb-4 flex items-baseline gap-3.5">
          <h2 className="font-heading text-2xl font-bold">Jugado recientemente</h2>
          <Link
            href={`/u/${profile.handle}`}
            className="ml-auto text-xs font-bold uppercase tracking-wide text-accent"
          >
            Toda la biblioteca ({stats.juegos})
          </Link>
        </div>

        {recientes.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
            No hay ningún juego en tus cuentas vinculadas. Suele ser que el
            perfil está en privado en la plataforma.
          </p>
        ) : (
          <div className="relative -mx-4 overflow-hidden px-4 sm:mx-0 sm:px-0">
            <div className={`flex w-max gap-4 ${recientes.length >= 3 ? "animate-marquee" : ""} hover:[animation-play-state:paused]`}>
              {[...recientes, ...recientes, ...recientes].map((game, i) => {
                const progress = gameProgress(game);
                return (
                  <TiltCard
                    key={`${game.id}-${i}`}
                    href={`/u/${profile.handle}/${game.id}`}
                    className="group relative w-[160px] shrink-0 cursor-pointer overflow-hidden rounded-[20px] transition-all duration-300 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] sm:w-[220px]"
                    style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
                  >
                    <div className="relative flex aspect-[3/4] items-end p-4 overflow-hidden">
                      <div 
                        className="absolute inset-[-15%] bg-cover bg-center blur-2xl opacity-40"
                        style={game.iconUrl ? { backgroundImage: `url(${game.iconUrl})` } : { background: coverGradient(game.id) }} 
                      />
                      {game.iconUrl && (
                        <div 
                          className="absolute inset-0 bg-contain bg-no-repeat bg-center opacity-90 group-hover:opacity-100 transition-opacity duration-300"
                          style={{ backgroundImage: `url(${game.iconUrl})`, margin: '10% 10% 30% 10%' }}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0d13] via-[#0a0d13]/60 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-100" />
                      <p
                        className="font-heading relative z-10 translate-y-2 text-[15px] font-bold leading-tight text-white transition-transform duration-300 group-hover:translate-y-0 sm:text-[17px]"
                        style={{ textShadow: "0 2px 16px rgba(0, 0, 0, 0.9)" }}
                      >
                        {game.title}
                      </p>
                    </div>
                    <div className="relative z-10 bg-[var(--surface)] p-4 pt-1">
                      <div className="h-[5px] overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${progress.percent}%`, background: "var(--accent-grad-h)" }}
                        />
                      </div>
                      <div className="mt-2.5 flex justify-between text-[12px] font-medium text-muted">
                        <span className="font-bold" style={{ color: "var(--accent-text)" }}>{progress.percent}%</span>
                        <span>{progress.earned}/{progress.total}</span>
                      </div>
                    </div>
                  </TiltCard>
                );
              })}
            </div>
            {recientes.length >= 3 && (
              <>
                <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent z-20" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent z-20" />
              </>
            )}
          </div>
        )}
      </section>

      <section>
        <ActivityFeed activities={await getFeed(session.user.id)} currentUserId={session.user.id} />
      </section>
    </div>
  );
}
