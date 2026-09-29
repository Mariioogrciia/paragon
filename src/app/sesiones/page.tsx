import { and, eq, lt } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { games, userGames } from "@/db/schema";
import { Avatar } from "@/components/Avatar";
import { BackButton } from "@/components/BackButton";
import { listarSesiones, type SesionVista } from "@/lib/sesiones";
import { AccionesSesion } from "./AccionesSesion";
import { NuevaSesion } from "./NuevaSesion";

export const metadata = { title: "Sesiones · Paragon" };

/**
 * Sesiones de trofeos online en grupo — ver lib/sesiones.ts. Primero las de
 * juegos que tienes: son las únicas a las que te puedes apuntar de verdad.
 */
export default async function SesionesPage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const t = await getTranslations("Shell.Sesiones");
  const locale = await getLocale();

  const [sesiones, misJuegos] = await Promise.all([
    listarSesiones(userId).catch((): SesionVista[] => []),
    userId
      ? db
          .select({ id: games.id, titulo: games.title, platform: games.platform })
          .from(userGames)
          .innerJoin(games, eq(games.id, userGames.gameId))
          .where(and(eq(userGames.userId, userId), eq(userGames.isWishlist, false), lt(userGames.progressPercent, 100)))
          .orderBy(games.title)
      : Promise.resolve([]),
  ]);
  const ordenadas = [...sesiones].sort((a, b) => Number(b.loTengo) - Number(a.loTengo));
  const ahora = new Date();

  return (
    <div className="mx-auto max-w-[900px] space-y-8">
      <BackButton fallbackHref="/" />
      <div>
        <h1 className="font-heading text-[2.625rem] font-bold uppercase leading-none">{t("titulo")}</h1>
        <p className="mt-2 max-w-[650px] text-sm text-muted">{t("subtitulo")}</p>
      </div>

      <section className="rounded-[18px] border border-border bg-surface p-5">
        <h2 className="mb-4 font-heading text-xl font-bold">{t("nueva")}</h2>
        {userId ? <NuevaSesion juegos={misJuegos} /> : <p className="text-sm text-muted">{t("entra")}</p>}
      </section>

      <section>
        <h2 className="mb-4 font-heading text-xl font-bold">{t("proximas")}</h2>
        {ordenadas.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">{t("vacio")}</p>
        ) : (
          <div className="grid gap-3">
            {ordenadas.map((s) => {
              const libres = Math.max(0, s.plazas - s.apuntados);
              const empezada = s.fechaHora <= ahora;
              const nombre = s.anfitrion.name?.trim().split(/\s+/)[0] || `@${s.anfitrion.handle}`;
              return (
                <article
                  key={s.id}
                  id={s.id}
                  className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center"
                  style={{ borderColor: s.loTengo ? "rgb(var(--accent-rgb) / 0.35)" : "var(--border)", background: "var(--surface)" }}
                >
                  <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                    {s.juego.iconUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.juego.iconUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted">
                      {s.juego.titulo} · {s.juego.platform.toUpperCase()}
                      {s.loTengo && <span className="ml-2 text-[var(--accent-text)]">{t("loTienes")}</span>}
                    </p>
                    <p className="mt-0.5 truncate text-base font-bold">{s.trofeo}</p>
                    <p className="text-sm text-muted">
                      {empezada
                        ? t("empezada")
                        : s.fechaHora.toLocaleString(locale, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" })}
                      {" · "}
                      {t("plazasLibres", { libres })}
                    </p>
                    {s.descripcion && <p className="mt-1 text-sm">{s.descripcion}</p>}
                    <div className="mt-2 flex items-center gap-2">
                      <Avatar src={s.anfitrion.image} name={nombre} size={22} />
                      <span className="text-xs text-muted">{t("organiza", { nombre })}</span>
                      <div className="ml-1 flex -space-x-1.5">
                        {s.participantes.slice(0, 8).map((p) => (
                          <Avatar key={p.userId} src={p.image} name={p.name ?? p.handle ?? "?"} size={22} />
                        ))}
                      </div>
                    </div>
                  </div>
                  {userId && !empezada && (
                    <AccionesSesion sessionId={s.id} soyAnfitrion={s.soyAnfitrion} estoyApuntado={s.estoyApuntado} llena={libres === 0} />
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
