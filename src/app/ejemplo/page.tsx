import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { GameCard } from "@/components/GameCard";
import { ParagonWrap } from "@/components/ParagonWrap";
import { StatTile } from "@/components/StatTile";
import { TrophyCountRow } from "@/components/TrophyCounts";
import { DEMO_ANIO, DEMO_JUEGOS, DEMO_JUGADOR } from "@/lib/demo";
import { gameProgress, summarise } from "@/lib/stats";

export const metadata = { title: "Perfil de ejemplo · Paragon" };

/**
 * El perfil de ejemplo de la portada.
 *
 * Se pinta con los MISMOS componentes que un perfil real (tarjetas, cifras,
 * fila de metales, Wrap) y datos inventados de `lib/demo`: si el ejemplo se
 * dibujara aparte, dejaría de parecerse a la app en cuanto alguien tocara la
 * de verdad.
 *
 * Las tarjetas llevan a registrarse en vez de a una ficha: la ficha necesita
 * un juego que exista en la base, y aquí no existe ninguno. Antes este botón
 * de la portada apuntaba a un perfil por handle que ya no está, así que daba
 * un 404 en la cara al primero que lo pulsara.
 */
export default function EjemploPage() {
  const stats = summarise(DEMO_JUEGOS);
  const favoritos = DEMO_JUEGOS.filter((g) => gameProgress(g).platinumEarned).slice(0, 4);

  return (
    <div className="-mx-7 -mt-9">
      <div
        className="relative overflow-hidden border-b border-border"
        style={{
          background:
            "radial-gradient(700px 320px at 25% 0%, rgb(var(--accent-rgb) / 0.18), transparent 70%)",
        }}
      >
        <div className="mx-auto max-w-[1240px] px-7 pb-8 pt-8">
          <div
            className="mb-6 flex flex-wrap items-center gap-3 rounded-xl px-4 py-3"
            style={{
              border: "1px solid rgb(var(--accent-rgb) / 0.32)",
              background: "rgb(var(--accent-rgb) / 0.1)",
            }}
          >
            <span className="text-[13px] font-bold uppercase tracking-[0.08em]" style={{ color: "var(--accent-text)" }}>
              Perfil de ejemplo
            </span>
            <span className="text-[13px] text-muted">
              Datos inventados. Así se ve un perfil cuando vinculas tus cuentas.
            </span>
            <Link
              href="/entrar"
              className="ml-auto rounded-[10px] px-4 py-2 text-[13px] font-bold text-background transition-all hover:-translate-y-0.5 hover:shadow-[0_0_16px_rgb(var(--accent-rgb) / 0.4)]"
              style={{ background: "var(--accent-grad)" }}
            >
              Crear el mío
            </Link>
          </div>

          <div className="flex flex-wrap items-end gap-5">
            <Avatar src={null} name={DEMO_JUGADOR.name} size={92} />

            <div className="min-w-0">
              <h1 className="font-heading text-[42px] font-bold uppercase leading-none">
                {DEMO_JUGADOR.name}
              </h1>
              <p className="mt-2 text-sm text-muted">@ejemplo · PS5 · PC · Switch</p>
              <p className="mt-3 text-[13px] font-bold tracking-[0.06em] text-accent-2">
                NIVEL {DEMO_JUGADOR.trophyLevel}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1240px] space-y-9 px-7 pb-24 pt-6">
        <ParagonWrap
          games={DEMO_JUEGOS}
          esteAnio={DEMO_ANIO.trofeos}
          juegosEsteAnio={DEMO_ANIO.juegos}
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile value={stats.platinos} label="Platinos" accent="var(--platinum)" />
          <StatTile value={stats.trofeos} label="Trofeos" />
          <StatTile value={stats.juegos} label="Juegos" />
          <StatTile value={`${stats.completadoMedio}%`} label="Completado medio" />
        </div>

        <TrophyCountRow
          counts={stats.counts}
          summary={`${stats.trofeos} trofeos en ${stats.juegos} juegos`}
        />

        {favoritos.length > 0 && (
          <section>
            <h2 className="font-heading mb-4 text-xl font-bold uppercase tracking-wide text-muted">
              Juegos favoritos
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {favoritos.map((game) => (
                <GameCard key={game.id} game={game} href="/entrar" />
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="mb-4 flex flex-wrap items-center gap-3.5">
            <h2 className="font-heading text-2xl font-bold">Biblioteca</h2>
            <span className="text-[13px] text-muted">
              {DEMO_JUEGOS.length} juegos · del más reciente al más antiguo
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[...DEMO_JUEGOS]
              .sort((a, b) => (b.lastPlayedAt ?? "").localeCompare(a.lastPlayedAt ?? ""))
              .map((game) => (
                <GameCard key={game.id} game={game} href="/entrar" />
              ))}
          </div>
        </section>

        <div
          className="rounded-[18px] p-8 text-center"
          style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
        >
          <h2 className="font-heading text-2xl font-bold">Esto con tus juegos</h2>
          <p className="mx-auto mt-2 max-w-[520px] text-[15px] text-muted">
            Vinculas tu ID público de PlayStation o tu perfil de Steam y la
            biblioteca se rellena sola. Sin contraseñas ni tokens.
          </p>
          <Link
            href="/entrar"
            className="mt-5 inline-block rounded-xl px-6 py-3.5 text-[15px] font-bold text-background transition-all hover:-translate-y-0.5 hover:shadow-[0_0_16px_rgb(var(--accent-rgb) / 0.4)]"
            style={{ background: "var(--accent-grad)" }}
          >
            Empezar la caza
          </Link>
        </div>
      </div>
    </div>
  );
}
