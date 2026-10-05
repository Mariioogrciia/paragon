import Link from "next/link";
import { Check, ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";

/**
 * Guía paso a paso para vincular el bot de Discord (5 oct 2026). Antes había
 * un interruptor suelto en Ajustes y dos párrafos en "Cómo funciona"; nadie
 * sabía qué hacía falta de verdad. Cada paso enseña su estado real
 * (¿Discord vinculado? ¿bot invitable?) y qué hacer si falla.
 *
 * Qué significa "vincular" aquí: el bot reconoce a quien escribe un comando
 * por su ID de Discord, que Paragon solo conoce si esa persona inició sesión
 * (o vinculó) con ESE Discord (`accounts.provider = 'discord'`). Y el bot,
 * además, tiene que estar dentro del servidor donde se escribe.
 */
const INVITACION = process.env.DISCORD_APPLICATION_ID
  ? `https://discord.com/oauth2/authorize?client_id=${process.env.DISCORD_APPLICATION_ID}&scope=bot%20applications.commands&permissions=3072`
  : undefined;

function Paso({ n, titulo, listo, opcional, etiquetaOpcional, children }: { n: number; titulo: string; listo?: boolean; opcional?: boolean; etiquetaOpcional: string; children: React.ReactNode }) {
  return (
    <li className="rounded-[16px] p-5" style={{ background: "var(--surface)", border: `1px solid ${listo ? "rgb(52 168 83 / 0.4)" : "var(--border)"}` }}>
      <div className="flex items-start gap-4">
        <span
          className="font-heading flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
          style={listo ? { background: "rgb(52 168 83 / 0.15)", color: "#86efac" } : { background: "var(--accent-soft)", color: "var(--accent-text)", border: "1px solid var(--accent-line)" }}
          aria-hidden="true"
        >
          {listo ? <Check size={18} /> : n}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-lg font-bold leading-tight">
            {titulo}
            {opcional && <span className="ml-2 align-middle text-[0.6875rem] font-semibold uppercase tracking-wider text-muted">{etiquetaOpcional}</span>}
          </h2>
          <div className="mt-2 flex flex-col gap-3 text-sm leading-relaxed text-muted">{children}</div>
        </div>
      </div>
    </li>
  );
}

/**
 * `vinculado`: este Discord ya está vinculado a la cuenta (null = no hay sesión: se enseña la guía sin estados).
 * `urlBoton1`: a dónde lleva el paso 1 (Ajustes → seguridad con sesión, el login sin ella).
 */
export async function GuiaBotDiscord({ vinculado, urlPaso1 }: { vinculado: boolean | null; urlPaso1: string }) {
  const t = await getTranslations("Onboarding");
  const cmd = (chunks: React.ReactNode) => <kbd className="manual-mando">{chunks}</kbd>;
  const enlace = "inline-flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-[0.8125rem] font-bold transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0";

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-heading mb-2 text-2xl font-bold">{t("guiaDiscord.titulo")}</h1>
        <p className="text-sm text-muted">{t("guiaDiscord.descripcion")}</p>
      </div>

      <ol className="flex flex-col gap-4">
        <Paso etiquetaOpcional={t("guiaDiscord.opcional")} n={1} titulo={t("guiaDiscord.p1.titulo")} listo={vinculado === true}>
          <p>{t("guiaDiscord.p1.texto")}</p>
          {vinculado === true ? (
            <p className="font-semibold" style={{ color: "#86efac" }}>{t("guiaDiscord.p1.listo")}</p>
          ) : (
            <div>
              <Link href={urlPaso1} className={enlace} style={{ background: "#5865F2", color: "#fff" }}>
                {t("guiaDiscord.p1.boton")}
              </Link>
            </div>
          )}
        </Paso>

        <Paso etiquetaOpcional={t("guiaDiscord.opcional")} n={2} titulo={t("guiaDiscord.p2.titulo")}>
          <p>{t.rich("guiaDiscord.p2.texto", { b: (c) => <strong className="text-foreground">{c}</strong> })}</p>
          {INVITACION ? (
            <div>
              <a href={INVITACION} target="_blank" rel="noopener noreferrer" className={enlace} style={{ background: "var(--accent-grad)", color: "var(--background)" }}>
                {t("guiaDiscord.p2.boton")}
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            </div>
          ) : (
            <p className="font-semibold text-foreground">{t("guiaDiscord.p2.sinConfigurar")}</p>
          )}
          <p className="text-xs">{t("guiaDiscord.p2.yaEsta")}</p>
        </Paso>

        <Paso etiquetaOpcional={t("guiaDiscord.opcional")} n={3} titulo={t("guiaDiscord.p3.titulo")}>
          <p>{t.rich("guiaDiscord.p3.texto", { c: cmd })}</p>
          <p className="text-xs">{t("guiaDiscord.p3.nota")}</p>
        </Paso>

        <Paso etiquetaOpcional={t("guiaDiscord.opcional")} n={4} titulo={t("guiaDiscord.p4.titulo")} opcional>
          <p>{t.rich("guiaDiscord.p4.texto", { c: cmd })}</p>
        </Paso>

        <Paso etiquetaOpcional={t("guiaDiscord.opcional")} n={5} titulo={t("guiaDiscord.p5.titulo")} opcional>
          <p>{t("guiaDiscord.p5.texto")}</p>
          <div>
            <Link href={vinculado === null ? "/entrar" : "/ajustes"} className={enlace} style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)" }}>
              {t("guiaDiscord.p5.boton")}
            </Link>
          </div>
        </Paso>
      </ol>

      <section>
        <h2 className="font-heading mb-3 text-lg font-bold">{t("guiaDiscord.fallos.titulo")}</h2>
        <div className="flex flex-col gap-2">
          {(["noVinculada", "noResponde", "noComandos", "noDm"] as const).map((k) => (
            <details key={k} className="group rounded-[12px] px-4 py-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <summary className="cursor-pointer text-sm font-semibold transition-colors hover:text-[var(--accent-text)]">{t(`guiaDiscord.fallos.${k}.pregunta`)}</summary>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t.rich(`guiaDiscord.fallos.${k}.respuesta`, { c: cmd })}</p>
            </details>
          ))}
        </div>
      </section>

      <p className="text-xs text-muted">
        {t.rich("guiaDiscord.comandos", {
          link: (c) => (
            <Link href="/como-funciona" className="font-semibold text-[var(--accent-text)] underline-offset-2 hover:underline">
              {c}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}
