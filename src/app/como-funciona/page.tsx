import React from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BackButton } from "@/components/BackButton";
import { IndiceManual } from "@/components/IndiceManual";
import { BarChart3, Bell, CalendarClock, Layers, Link2, Trophy, UserRound, Users, type LucideIcon } from "lucide-react";

export const metadata = { title: "Cómo funciona · Paragon" };

/**
 * Apartado del manual (rediseño del 1 oct 2026): título y texto como en el
 * librito de instrucciones de un juego, sin tarjeta; el enlace a la pantalla
 * va al final como "ir a…".
 */
function Bloque({ title, children, href, hrefLabel }: { title: string; children: React.ReactNode; href?: string; hrefLabel?: string }) {
  return (
    <div className="manual-apartado">
      <h3 className="manual-apartado-titulo">{title}</h3>
      <div className="text-[0.9375rem] leading-relaxed text-muted">{children}</div>
      {href && (
        <Link href={href} className="manual-ir rounded-md">
          {hrefLabel}
        </Link>
      )}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="manual-apartados">{children}</div>;
}

const DISCORD_INVITE_URL = process.env.DISCORD_APPLICATION_ID
  ? `https://discord.com/oauth2/authorize?client_id=${process.env.DISCORD_APPLICATION_ID}&scope=bot%20applications.commands&permissions=3072`
  : undefined;

function Comando({ nombre, children }: { nombre: string; children: React.ReactNode }) {
  return (
    <li>
      <kbd className="manual-mando">/{nombre}</kbd> {children}
    </li>
  );
}

export default async function ComoFuncionaPage() {
  const t = await getTranslations("Shell.ComoFunciona");
  const tShell = await getTranslations("Shell.BackButton");

  const capitulos: { key: string; label: string; icono: LucideIcon; content: React.ReactNode }[] = [
    {
      key: "vincular",
      icono: Link2,
      label: t("tabs.vincular"),
      content: (
        <Grid>
          <Bloque title={t("vincular.b1t")} href="/ajustes/plataformas" hrefLabel={t("vincular.b1href")}>
            {t("vincular.b1")}
          </Bloque>
          <Bloque title={t("vincular.b2t")}>
            {t("vincular.b2")}
          </Bloque>
          <Bloque title={t("vincular.b3t")}>
            {t("vincular.b3")}
          </Bloque>
          <Bloque title={t("vincular.b4t")} href="/ajustes/plataformas" hrefLabel={t("irFlecha")}>
            {t("vincular.b4")}
          </Bloque>
        </Grid>
      ),
    },
    {
      key: "trofeos",
      icono: Trophy,
      label: t("tabs.trofeos"),
      content: (
        <Grid>
          <Bloque title={t("trofeos.b1t")} href="/#biblioteca" hrefLabel={t("irFlecha")}>
            {t("trofeos.b1")}
          </Bloque>
          <Bloque title={t("trofeos.b2t")}>
            {t("trofeos.b2")}
          </Bloque>
          <Bloque title={t("trofeos.b3t")}>
            {t("trofeos.b3")}
          </Bloque>
          <Bloque title={t("trofeos.b4t")}>
            {t("trofeos.b4")}
          </Bloque>
          <Bloque title={t("trofeos.b5t")}>
            {t("trofeos.b5")}
          </Bloque>
          <Bloque title={t("trofeos.b6t")}>
            {t("trofeos.b6")}
          </Bloque>
          <Bloque title={t("trofeos.b7t")}>
            {t("trofeos.b7")}
          </Bloque>
          <Bloque title={t("trofeos.b8t")}>
            {t("trofeos.b8")}
          </Bloque>
        </Grid>
      ),
    },
    {
      key: "estadisticas",
      icono: BarChart3,
      label: t("tabs.estadisticas"),
      content: (
        <Grid>
          <Bloque title={t("estadisticas.b1t")} href="/" hrefLabel={t("irFlecha")}>
            {t("estadisticas.b1")}
          </Bloque>
          <Bloque title={t("estadisticas.b2t")}>
            {t("estadisticas.b2")}
          </Bloque>
          <Bloque title={t("estadisticas.b3t")}>
            {t("estadisticas.b3")}
          </Bloque>
          <Bloque title={t("estadisticas.b4t")}>
            {t("estadisticas.b4")}
          </Bloque>
          <Bloque title={t("estadisticas.b5t")}>
            {t("estadisticas.b5")}
          </Bloque>
          <Bloque title={t("estadisticas.b6t")}>
            {t("estadisticas.b6")}
          </Bloque>
          <Bloque title={t("estadisticas.b7t")}>
            {t("estadisticas.b7")}
          </Bloque>
          <Bloque title={t("estadisticas.b8t")} href="/u/tu-handle/estadisticas" hrefLabel={t("estadisticas.b8href")}>
            {t("estadisticas.b8")}
          </Bloque>
        </Grid>
      ),
    },
    {
      key: "backlog",
      icono: Layers,
      label: t("tabs.backlog"),
      content: (
        <Grid>
          <Bloque title={t("backlog.b1t")}>
            {t("backlog.b1")}
          </Bloque>
          <Bloque title={t("backlog.b2t")}>
            {t("backlog.b2")}
          </Bloque>
          <Bloque title={t("backlog.b3t")} href="/" hrefLabel={t("irFlecha")}>
            {t("backlog.b3")}
          </Bloque>
          <Bloque title={t("backlog.b4t")} href="/descubrir" hrefLabel={t("backlog.b4href")}>
            {t("backlog.b4")}
          </Bloque>
          <Bloque title={t("backlog.b5t")}>
            {t("backlog.b5")}
          </Bloque>
          <Bloque title={t("backlog.b6t")} href="/noticias" hrefLabel={t("backlog.b6href")}>
            {t("backlog.b6")}
          </Bloque>
        </Grid>
      ),
    },
    {
      key: "comunidad",
      icono: Users,
      label: t("tabs.comunidad"),
      content: (
        <Grid>
          <Bloque title={t("comunidad.b1t")} href="/feed" hrefLabel={t("comunidad.b1href")}>
            {t("comunidad.b1")}
          </Bloque>
          <Bloque title={t("comunidad.b2t")}>
            {t("comunidad.b2")}
          </Bloque>
          <Bloque title={t("comunidad.b3t")}>
            {t("comunidad.b3")}
          </Bloque>
          <Bloque title={t("comunidad.b4t")} href="/comparar" hrefLabel={t("comunidad.b4href")}>
            {t("comunidad.b4")}
          </Bloque>
          <Bloque title={t("comunidad.b5t")} href="/amigos" hrefLabel={t("comunidad.b5href")}>
            {t("comunidad.b5")}
          </Bloque>
          <Bloque title={t("comunidad.b6t")} href="/ligas" hrefLabel={t("comunidad.b6href")}>
            {t("comunidad.b6")}
          </Bloque>
        </Grid>
      ),
    },
    {
      key: "planificador",
      icono: CalendarClock,
      label: t("tabs.planificador"),
      content: (
        <Grid>
          <Bloque title={t("planificador.b1t")} href="/planificador" hrefLabel={t("planificador.b1href")}>
            {t("planificador.b1")}
          </Bloque>
          <Bloque title={t("planificador.b2t")} href="/ritmo" hrefLabel={t("planificador.b2href")}>
            {t("planificador.b2")}
          </Bloque>
          <Bloque title={t("planificador.b3t")}>
            {t("planificador.b3")}
          </Bloque>
          <Bloque title={t("planificador.b4t")}>
            {t("planificador.b4")}
          </Bloque>
        </Grid>
      ),
    },
    {
      key: "notificaciones",
      icono: Bell,
      label: t("tabs.notificaciones"),
      content: (
        <Grid>
          <Bloque title={t("notificaciones.b1t")} href="/ajustes" hrefLabel={t("irFlecha")}>
            {t("notificaciones.b1")}
          </Bloque>
          <Bloque title={t("notificaciones.b2t")} href="/bot-discord" hrefLabel={t("irFlecha")}>
            {t.rich("notificaciones.b2", {
              link: (chunks) => (
                <Link href="/bot-discord" className="font-semibold text-[var(--accent-text)] underline-offset-2 hover:underline">
                  {chunks}
                </Link>
              ),
            })}
          </Bloque>
          <Bloque title={t("notificaciones.b3t")}>
            {DISCORD_INVITE_URL ? (
              t.rich("notificaciones.b3ConLink", {
                link: (chunks) => (
                  <a
                    href={DISCORD_INVITE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    {chunks}
                  </a>
                ),
                enviarMensajes: (chunks) => <em>{chunks}</em>,
                comando: (chunks) => <kbd className="manual-mando">{chunks}</kbd>,
              })
            ) : (
              t("notificaciones.b3SinConfigurar")
            )}
          </Bloque>
          <Bloque title={t("notificaciones.b4t")}>
            <ul className="space-y-1.5">
              <Comando nombre="perfil">{t("notificaciones.cmdPerfil")}</Comando>
              <Comando nombre="racha">{t("notificaciones.cmdRacha")}</Comando>
              <Comando nombre="platinosalalcance">{t("notificaciones.cmdPlatinosalalcance")}</Comando>
              <Comando nombre="verguenza">{t("notificaciones.cmdVerguenza")}</Comando>
              <Comando nombre="juego">{t("notificaciones.cmdJuego")}</Comando>
              <Comando nombre="nota">{t("notificaciones.cmdNota")}</Comando>
              <Comando nombre="hoy">{t("notificaciones.cmdHoy")}</Comando>
              <Comando nombre="ruleta">{t("notificaciones.cmdRuleta")}</Comando>
            </ul>
          </Bloque>
          <Bloque title={t("notificaciones.b5t")} href="/ligas" hrefLabel={t("notificaciones.b5href")}>
            <ul className="space-y-1.5">
              <Comando nombre="ligas">{t("notificaciones.cmdLigas")}</Comando>
              <Comando nombre="liga">{t("notificaciones.cmdLiga")}</Comando>
              <Comando nombre="invitacionesliga">{t("notificaciones.cmdInvitacionesliga")}</Comando>
            </ul>
          </Bloque>
          <Bloque title={t("notificaciones.b6t")}>
            {t.rich("notificaciones.b6ConComando", {
              comando: (chunks) => <kbd className="manual-mando">{chunks}</kbd>,
            })}
          </Bloque>
          <Bloque title={t("notificaciones.b7t")}>
            {t.rich("notificaciones.b7ConComando", {
              comando: (chunks) => <kbd className="manual-mando">{chunks}</kbd>,
            })}
          </Bloque>
        </Grid>
      ),
    },
    {
      key: "perfil",
      icono: UserRound,
      label: t("tabs.perfil"),
      content: (
        <Grid>
          <Bloque title={t("perfil.b1t")} href="/ajustes" hrefLabel={t("irFlecha")}>
            {t("perfil.b1")}
          </Bloque>
          <Bloque title={t("perfil.b2t")}>
            {t("perfil.b2")}
          </Bloque>
          <Bloque title={t("perfil.b3t")}>
            {t("perfil.b3")}
          </Bloque>
          <Bloque title={t("perfil.b4t")} href="/ajustes/ocultar" hrefLabel={t("perfil.b4href")}>
            {t("perfil.b4")}
          </Bloque>
          <Bloque title={t("perfil.b5t")}>
            {t("perfil.b5")}
          </Bloque>
          <Bloque title={t("perfil.b6t")} href="/privacidad" hrefLabel={t("perfil.b6href")}>
            {t.rich("perfil.b6ConLinks", {
              cookies: (chunks) => <Link href="/cookies" className="text-accent hover:underline">{chunks}</Link>,
              terminos: (chunks) => <Link href="/terminos" className="text-accent hover:underline">{chunks}</Link>,
            })}
          </Bloque>
          <Bloque title={t("perfil.b7t")} href="/ajustes/seguridad" hrefLabel={t("perfil.b7href")}>
            {t.rich("perfil.b7ConLink", {
              privacidad: (chunks) => <Link href="/privacidad" className="text-accent hover:underline">{chunks}</Link>,
            })}
          </Bloque>
        </Grid>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl py-10">
      <BackButton fallbackHref="/" label={tShell("volverAlInicio")} />

      <div className="mb-8">
        <h1 className="font-heading text-4xl font-bold uppercase tracking-wide">{t("titulo")}</h1>
        <p className="mt-2 max-w-2xl text-muted">
          {t("descripcion")}
        </p>
      </div>

      {/* Mismo contenido que las pestañas de antes, ahora como capítulos
          seguidos con un índice fijo. */}
      <div className="manual">
        <IndiceManual titulo={t("indice")} capitulos={capitulos.map((c) => ({ id: c.key, titulo: c.label }))} />
        <div className="min-w-0">
          {capitulos.map((c, i) => {
            const Icono = c.icono;
            return (
              <section key={c.key} id={c.key} className="manual-capitulo" aria-labelledby={`cap-${c.key}`}>
                <div className="manual-portadilla">
                  <span className="manual-num" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                  <Icono size={22} className="shrink-0 text-[var(--accent-text)]" aria-hidden="true" />
                  <h2 id={`cap-${c.key}`} className="font-heading text-[clamp(1.5rem,4vw,2rem)] font-bold uppercase leading-tight">{c.label}</h2>
                </div>
                {c.content}
              </section>
            );
          })}
        </div>
      </div>

    </div>
  );
}
