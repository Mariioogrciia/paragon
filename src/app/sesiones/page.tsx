import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Avatar } from "@/components/Avatar";
import { BackButton } from "@/components/BackButton";
import { juegosParaSesion, listarSesiones, type SesionVista } from "@/lib/sesiones";
import { idiomaActual } from "@/lib/trofeosIdioma";
import { NuevaSesion } from "./NuevaSesion";
import { Plazas } from "./Plazas";
import { SeccionTabs } from "@/components/SeccionTabs";

export const metadata = { title: "Sesiones · Paragon" };

/**
 * Sesiones de trofeos online en grupo — ver lib/sesiones.ts. Primero las de
 * juegos que tienes: son las únicas a las que te puedes apuntar de verdad.
 * La lista es solo un índice: quién está dentro, los detalles y el botón para
 * unirse viven en la ficha (`/sesiones/[id]`).
 */
export default async function SesionesPage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const t = await getTranslations("Shell.Sesiones");
  const locale = await getLocale();
  const idioma = await idiomaActual();

  const [sesiones, misJuegos] = await Promise.all([
    listarSesiones(userId, idioma).catch((): SesionVista[] => []),
    userId
      ? juegosParaSesion(userId)
      : Promise.resolve([]),
  ]);
  const ordenadas = [...sesiones].sort((a, b) => Number(b.loTengo) - Number(a.loTengo));
  const ahora = new Date();

  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      <BackButton fallbackHref="/" />
      <SeccionTabs seccion="comunidad" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-[2.625rem] font-bold uppercase leading-none">{t("titulo")}</h1>
          <p className="mt-2 max-w-[560px] text-sm text-muted">{t("subtitulo")}</p>
        </div>
      </div>

      {/* Plegado: la mayoría viene a mirar las que hay, no a organizar. */}
      <details className="group rounded-[18px] border border-border bg-surface">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-heading text-lg font-bold [&::-webkit-details-marker]:hidden">
          <span>＋ {t("nueva")}</span>
          <span className="text-muted transition-transform group-open:rotate-45" aria-hidden>
            ＋
          </span>
        </summary>
        <div className="border-t border-border p-5">
          {userId ? <NuevaSesion juegos={misJuegos} /> : <p className="text-sm text-muted">{t("entra")}</p>}
        </div>
      </details>

      <section>
        <h2 className="mb-3 font-heading text-xl font-bold">{t("proximas")}</h2>
        {ordenadas.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">{t("vacio")}</p>
        ) : (
          <ul className="grid gap-2">
            {ordenadas.map((s) => {
              const empezada = s.fechaHora <= ahora;
              const nombre = s.anfitrion.name?.trim().split(/\s+/)[0] || `@${s.anfitrion.handle}`;
              return (
                <li key={s.id} id={s.id}>
                  <Link
                    href={`/sesiones/${s.id}`}
                    className="flex items-center gap-3 rounded-2xl border p-3 transition-colors hover:border-accent/60 hover:bg-surface-2"
                    style={{ borderColor: s.loTengo ? "rgb(var(--accent-rgb) / 0.35)" : "var(--border)", background: "var(--surface)" }}
                  >
                    <div className="h-14 w-10 shrink-0 overflow-hidden rounded-md bg-surface-2">
                      {s.juego.iconUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.juego.iconUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.6875rem] font-bold uppercase tracking-wide text-muted">
                        {s.juego.titulo} · {s.juego.deviceLabel}
                        {s.estoyApuntado || s.soyAnfitrion ? (
                          <span className="ml-2 text-[var(--accent-text)]">{t("dentro")}</span>
                        ) : (
                          s.loTengo && <span className="ml-2 text-[var(--accent-text)]">{t("loTienes")}</span>
                        )}
                      </p>
                      <p className="truncate text-[0.9375rem] font-bold">{s.trofeo}</p>
                      <p className="flex items-center gap-1.5 truncate text-xs text-muted">
                        <Avatar src={s.anfitrion.image} name={nombre} size={16} />
                        {empezada
                          ? t("empezada")
                          : s.fechaHora.toLocaleString(locale, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" })}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Plazas ocupadas={s.ocupadas} total={s.plazasTotales} />
                      <span className="text-[0.6875rem] text-muted">{t("plazasLibres", { libres: s.libres })}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
