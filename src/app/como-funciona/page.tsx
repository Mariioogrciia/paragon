import React from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BackButton } from "@/components/BackButton";
import { SectionTabs } from "@/components/SectionTabs";

export const metadata = { title: "Cómo funciona · Paragon" };

const CARD = { border: "1px solid var(--border)", background: "linear-gradient(var(--surface), var(--background))" };

function Bloque({ title, children, href, hrefLabel }: { title: string; children: React.ReactNode; href?: string; hrefLabel?: string }) {
  return (
    <div className="rounded-2xl p-5" style={CARD}>
      <h3 className="mb-2 font-heading text-base font-bold uppercase tracking-wide">{title}</h3>
      <div className="text-sm leading-relaxed text-muted">{children}</div>
      {href && (
        <Link href={href} className="mt-3 inline-block text-xs font-bold uppercase tracking-wide text-accent hover:underline">
          {hrefLabel}
        </Link>
      )}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>;
}

const DISCORD_INVITE_URL = process.env.DISCORD_APPLICATION_ID
  ? `https://discord.com/oauth2/authorize?client_id=${process.env.DISCORD_APPLICATION_ID}&scope=bot%20applications.commands&permissions=3072`
  : undefined;

function Comando({ nombre, children }: { nombre: string; children: React.ReactNode }) {
  return (
    <li>
      <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">/{nombre}</code> — {children}
    </li>
  );
}

export default async function ComoFuncionaPage() {
  const t = await getTranslations("Shell.ComoFunciona");
  const tShell = await getTranslations("Shell.BackButton");

  return (
    <div className="mx-auto max-w-5xl py-10">
      <BackButton fallbackHref="/" label={tShell("volverAlInicio")} />

      <div className="mb-8">
        <h1 className="font-heading text-4xl font-bold uppercase tracking-wide">{t("titulo")}</h1>
        <p className="mt-2 max-w-2xl text-muted">
          {t("descripcion")}
        </p>
      </div>

      <SectionTabs
        storageKey="como-funciona"
        tabs={[
          {
            key: "vincular",
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
            label: t("tabs.notificaciones"),
            content: (
              <Grid>
                <Bloque title={t("notificaciones.b1t")} href="/ajustes" hrefLabel={t("irFlecha")}>
                  {t("notificaciones.b1")}
                </Bloque>
                <Bloque title={t("notificaciones.b2t")} href="/ajustes" hrefLabel={t("irFlecha")}>
                  {t("notificaciones.b2")}
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
                      comando: (chunks) => <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">{chunks}</code>,
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
                    comando: (chunks) => <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">{chunks}</code>,
                  })}
                </Bloque>
                <Bloque title={t("notificaciones.b7t")}>
                  {t.rich("notificaciones.b7ConComando", {
                    comando: (chunks) => <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">{chunks}</code>,
                  })}
                </Bloque>
              </Grid>
            ),
          },
          {
            key: "perfil",
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
        ]}
      />
    </div>
  );
}
