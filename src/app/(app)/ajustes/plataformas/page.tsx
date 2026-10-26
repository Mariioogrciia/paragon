/* eslint-disable @next/next/no-img-element -- imágenes de CDNs externos (PSN, Steam, Xbox, IGDB...), como en el resto de la web: next/image gastaría la cuota de optimización del plan Hobby */
import Link from "@/components/Enlace";
import { redirect } from "next/navigation";
import { BadgeCheck, ShieldQuestion } from "lucide-react";
import { useLocale } from "next-intl";
import { auth, signIn } from "@/auth";
import { cuentaVerificada } from "@/lib/verificacion";
import { quitarSteamExtraAction, unlinkAccountAction } from "@/app/actions";
import { CollectionManager } from "@/components/Collections";
import { AnadirSteamExtraForm, LinkPsnForm, LinkSteamForm, LinkXboxForm, LinkEpicForm, SyncNowForm, SyncPlatformForm } from "@/components/forms/Forms";
import { cuentasSteamExtra, type CuentaSteamExtra } from "@/lib/steamExtraDatos";
import { listCollections } from "@/lib/collections";
import { relativeDate } from "@/lib/design";
import { SaludSincronizacion } from "@/components/SaludSincronizacion";
import { saludSincronizacion } from "@/lib/syncHealth";
import { accountFor, getProfileByUserId, getUserTimezone } from "@/lib/profiles";
import { PLATFORM_LABEL, type AccountPlatform, type PlataformaVinculable, type PlatformAccount } from "@/lib/types";
import { getSyncHistory } from "@/lib/syncHistory";
import { PlayStationLogo, SteamLogo, XboxLogo, NintendoLogo, EpicGamesLogo } from "@/components/ui/PlatformLogos";
import { ConfirmForm } from "@/components/ui/ConfirmForm";
import { getLocale, getTranslations } from "next-intl/server";
import { CompletarSteamSiHaceFalta } from "@/components/CompletarSteamSiHaceFalta";
import { ExtensionEpic } from "@/components/ExtensionEpic";
import { idParaPaginaDeLogros, tieneJuegosDeEpic } from "@/lib/epic/estado";
import type { MotivoFalloEpic } from "@/lib/epicVuelta";

const MOTIVOS_EPIC: (MotivoFalloEpic | "extension")[] = ["cancelado", "estado", "fallo", "extension"];

export async function generateMetadata() {
  const t = await getTranslations("Onboarding.ajustesNav");
  return { title: `${t("plataformas")} · ${t("titulo")} · Paragon` };
}


const AVATAR_BG: Record<PlataformaVinculable, string> = {
  psn: "linear-gradient(150deg, #2f7ad6, #6b3fd4)",
  steam: "linear-gradient(150deg, #2f7d9d, #1b2838)",
  xbox: "linear-gradient(150deg, #107C10, #16a316)",
  epic: "linear-gradient(150deg, #313131, #0a0a0a)",
};

type Traductor = Awaited<ReturnType<typeof getTranslations>>;

/**
 * Fila de una plataforma (rediseño del 1 oct 2026): a la izquierda quién
 * eres ahí (cuenta, estado, sincronizar, desvincular); a la derecha cambiar
 * de cuenta con el campo a lo ancho. Antes eran cuatro columnas estrechas
 * donde el nombre de cuenta se quedaba en "MaR" y nada cuadraba en altura.
 */
function PlatformSection({
  platform,
  account,
  t,
  children,
  verificada = false,
}: {
  platform: PlataformaVinculable;
  account: PlatformAccount | null;
  t: Traductor;
  children: React.ReactNode;
  /** Cuenta confirmada por la propia plataforma (Epic y Steam: lib/verificacion.ts). */
  verificada?: boolean;
}) {
  const idioma = useLocale();
  const sincronizado = account?.syncedAt ? relativeDate(account.syncedAt, idioma) : null;

  return (
    <section className="cuenta-fila" aria-labelledby={`cuenta-${platform}`}>
      <div className="cuenta-identidad">
        <div className="flex items-center gap-3">
          <span className="cuenta-logo" style={{ background: AVATAR_BG[platform] }}>
            {platform === "psn" && <PlayStationLogo className="h-5 w-5" />}
            {platform === "steam" && <SteamLogo className="h-5 w-5" />}
            {platform === "xbox" && <XboxLogo className="h-5 w-5" />}
            {platform === "epic" && <EpicGamesLogo className="h-5 w-5" />}
          </span>
          <h2 id={`cuenta-${platform}`} className="font-heading text-lg font-bold">
            {PLATFORM_LABEL[platform]}
          </h2>
          {account && (
            <span className="cuenta-estado ml-auto" data-privada={!account.isPublic || undefined}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
              {account.isPublic ? t("ajustesPlataformas.linked") : t("ajustesPlataformas.private")}
            </span>
          )}
        </div>

        {account ? (
          <>
            <div className="mt-4 flex items-center gap-3">
              <span className="cuenta-avatar" style={{ background: AVATAR_BG[platform] }}>
                {account.avatarUrl ? (
                  <img loading="lazy" decoding="async" src={account.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  account.username.charAt(0).toUpperCase()
                )}
              </span>
              <div className="min-w-0">
                <p className="flex min-w-0 items-center gap-1.5 text-[0.9375rem] font-semibold" title={account.username}>
                  <span className="truncate">{account.username}</span>
                  {verificada && (
                    <span className="flex shrink-0 items-center gap-1 text-[0.6875rem] font-bold text-[var(--accent-text)]">
                      <BadgeCheck size={14} aria-hidden="true" />
                      {t("ajustesPlataformas.epicOficial.verificada")}
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted">
                  {account.level !== null ? t("ajustesPlataformas.levelLabel", { level: account.level }) : t("ajustesPlataformas.accountLinked")}
                  {sincronizado && t("ajustesPlataformas.syncedAt", { date: sincronizado })}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
              {/* Epic no se sincroniza desde el servidor (lo bloquea): solo con la extensión. */}
              {platform !== "epic" && <SyncPlatformForm platform={platform} label={PLATFORM_LABEL[platform]} />}
              <ConfirmForm
                action={unlinkAccountAction}
                hidden={{ platform }}
                title={t("ajustesPlataformas.confirmUnlink.title", { platform: PLATFORM_LABEL[platform] })}
                message={t("ajustesPlataformas.confirmUnlink.message")}
                confirmLabel={t("ajustesPlataformas.confirmUnlink.confirmLabel")}
                triggerClassName="rounded-md px-1 py-0.5 text-[0.8125rem] font-semibold text-muted transition-colors hover:bg-[var(--surface-2)] hover:text-danger"
              >
                {t("ajustesPlataformas.confirmUnlink.trigger", { platform: PLATFORM_LABEL[platform] })}
              </ConfirmForm>
            </div>
          </>
        ) : (
          <p className="mt-3 text-[0.8125rem] text-muted">{t(`ajustesPlataformas.help.${platform}`)}</p>
        )}
      </div>

      <div className="cuenta-formulario">
        <p className="mb-2.5 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-muted">
          {account ? t("ajustesPlataformas.changeAccount") : t("ajustesPlataformas.linkAccount")}
        </p>
        {children}
        {account && <p className="mt-2 text-xs text-muted">{t(`ajustesPlataformas.help.${platform}`)}</p>}
      </div>
    </section>
  );
}

/**
 * Otras cuentas de Steam (15 oct 2026, ver lib/steamExtra.ts): debajo de la
 * principal, la lista con "Quitar" y el campo para añadir otra. Solo sale
 * al desarrollador y con la principal ya vinculada.
 */
function CuentasSteamExtra({ cuentas, t, idioma }: { cuentas: CuentaSteamExtra[]; t: Traductor; idioma: string }) {
  return (
    <section className="cuenta-fila" aria-labelledby="cuenta-steam-extra">
      <div className="cuenta-identidad">
        <div className="flex items-center gap-3">
          <span className="cuenta-logo" style={{ background: AVATAR_BG.steam }}>
            <SteamLogo className="h-5 w-5" />
          </span>
          <h2 id="cuenta-steam-extra" className="font-heading text-lg font-bold">
            {t("ajustesPlataformas.steamExtra.titulo")}
          </h2>
        </div>
        <p className="mt-3 text-[0.8125rem] text-muted">{t("ajustesPlataformas.steamExtra.descripcion")}</p>
        {cuentas.length === 0 ? (
          <p className="mt-3 text-[0.8125rem] text-muted">{t("ajustesPlataformas.steamExtra.sinCuentas")}</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {cuentas.map((c) => (
              <li key={c.accountId} className="flex items-center gap-3">
                <span className="cuenta-avatar" style={{ background: AVATAR_BG.steam }}>
                  {c.avatarUrl ? (
                    <img loading="lazy" decoding="async" src={c.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    c.username.charAt(0).toUpperCase()
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.9375rem] font-semibold" title={c.username}>
                    {c.username}
                  </p>
                  <p className="text-xs text-muted">
                    {!c.isPublic
                      ? t("ajustesPlataformas.steamExtra.privada")
                      : c.syncedAt
                        ? t("ajustesPlataformas.steamExtra.sincronizada", { date: relativeDate(c.syncedAt, idioma) ?? "" })
                        : t("ajustesPlataformas.accountLinked")}
                  </p>
                </div>
                <ConfirmForm
                  action={quitarSteamExtraAction}
                  hidden={{ steamId: c.accountId }}
                  title={t("ajustesPlataformas.steamExtra.confirmTitulo", { nombre: c.username })}
                  message={t("ajustesPlataformas.steamExtra.confirmTexto")}
                  confirmLabel={t("ajustesPlataformas.steamExtra.confirmBoton")}
                  triggerClassName="rounded-md px-1 text-[0.8125rem] font-semibold text-muted transition-colors hover:bg-[var(--surface-2)] hover:text-danger"
                >
                  {t("ajustesPlataformas.steamExtra.quitar")}
                </ConfirmForm>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="cuenta-formulario">
        <p className="mb-2.5 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-muted">
          {t("ajustesPlataformas.steamExtra.anadir")}
        </p>
        <AnadirSteamExtraForm />
        <p className="mt-2 text-xs text-muted">{t("ajustesPlataformas.help.steam")}</p>
      </div>
    </section>
  );
}

export default async function AjustesPlataformasPage({ searchParams }: { searchParams: Promise<{ epic?: string; motivo?: string; steam?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/entrar");
  const { epic: resultadoEpic, motivo: motivoEpic, steam: resultadoSteam } = await searchParams;

  const profile = await getProfileByUserId(session.user.id);
  const psn = accountFor(profile, "psn");
  const steam = accountFor(profile, "steam");
  const xbox = accountFor(profile, "xbox");
  const epic = accountFor(profile, "epic");
  const carpetas = await listCollections(session.user.id);
  // Las tres en paralelo: son independientes y el pool no se resiente por
  // tres consultas (ver el aviso de conexiones en db/index.ts).
  const [historial, salud, tz] = await Promise.all([
    getSyncHistory(session.user.id),
    saludSincronizacion(session.user.id),
    getUserTimezone(session.user.id),
  ]);

  const t = await getTranslations("Onboarding");
  const steamExtra = profile?.esDesarrollador && steam ? await cuentasSteamExtra(session.user.id) : null;
  const tDeclarado = await getTranslations("Shell.Declarado");
  const locale = await getLocale();
  const loginEpic = Boolean(process.env.AUTH_EPIC_ID);
  const [epicConfirmada, steamConfirmada, epicConLogros] = await Promise.all([
    loginEpic && epic ? cuentaVerificada(session.user.id, "epic") : false,
    steam ? cuentaVerificada(session.user.id, "steam") : false,
    epic ? tieneJuegosDeEpic(session.user.id) : false,
  ]);
  // Motivo de un fallo del login de Epic (lib/epicVuelta.ts) o de la extensión (epic.js).
  const motivoFallo = MOTIVOS_EPIC.find((m) => m === motivoEpic) ?? "fallo";

  // Epic bloquea las lecturas desde el servidor (antibots): se sincroniza con
  // la extensión del navegador y el progreso es declarado (lib/declarado.ts).
  // Login oficial de Epic (Epic Account Services): vincula y verifica la
  // cuenta. Solo aparece si el servidor tiene el cliente de Epic configurado.
  const verificarEpic = loginEpic && (
    <div className="mb-4 rounded-xl border border-border p-4">
      {resultadoEpic === "verificada" && <p className="mb-2 text-xs font-semibold text-green-500">✓ {t("ajustesPlataformas.epicOficial.ok")}</p>}
      {resultadoEpic === "de-otro" && <p className="mb-2 text-xs font-semibold text-red-400">✕ {t("ajustesPlataformas.epicOficial.deOtro")}</p>}
      {epicConfirmada ? (
        <p className="flex items-center gap-2 text-[0.8125rem] font-semibold">
          <BadgeCheck size={16} className="shrink-0 text-[var(--accent-text)]" aria-hidden="true" />
          {t("ajustesPlataformas.epicOficial.yaVerificada")}
        </p>
      ) : (
        <form
          action={async () => {
            "use server";
            await signIn("epic", { redirectTo: "/ajustes/plataformas" });
          }}
        >
          <button
            type="submit"
            className="flex items-center gap-2 rounded-full bg-[#2a2a2a] px-4 py-2 text-[0.8125rem] font-bold text-white transition-colors hover:bg-[#3a3a3a]"
          >
            <EpicGamesLogo className="h-4 w-4" />
            {t("ajustesPlataformas.epicOficial.boton")}
          </button>
          <p className="mt-2 text-xs text-muted">{t("ajustesPlataformas.epicOficial.ayuda")}</p>
        </form>
      )}
    </div>
  );

  // «Iniciar sesión con Steam» oficial (OpenID 2.0, api/steam/verificar):
  // Steam confirma que la cuenta es tuya. No hace falta ninguna clave, así que
  // sale siempre. Es un enlace normal: el servidor redirige a Steam.
  const verificarSteam = (
    <div className="mb-4 rounded-xl border border-border p-4">
      {resultadoSteam === "verificada" && <p className="mb-2 text-xs font-semibold text-green-500">✓ {t("ajustesPlataformas.steamOficial.ok")}</p>}
      {resultadoSteam === "de-otro" && <p className="mb-2 text-xs font-semibold text-red-400">✕ {t("ajustesPlataformas.steamOficial.deOtro")}</p>}
      {resultadoSteam === "error" && <p className="mb-2 text-xs font-semibold text-red-400">✕ {t("ajustesPlataformas.steamOficial.error")}</p>}
      {steamConfirmada ? (
        <p className="flex items-center gap-2 text-[0.8125rem] font-semibold">
          <BadgeCheck size={16} className="shrink-0 text-[var(--accent-text)]" aria-hidden="true" />
          {t("ajustesPlataformas.steamOficial.yaVerificada")}
        </p>
      ) : (
        <>
          <a
            href="/api/steam/verificar"
            className="inline-flex items-center gap-2 rounded-full bg-[#1b2838] px-4 py-2 text-[0.8125rem] font-bold text-white transition-colors hover:bg-[#2a475e]"
          >
            <SteamLogo className="h-4 w-4" />
            {t("ajustesPlataformas.steamOficial.boton")}
          </a>
          <p className="mt-2 text-xs text-muted">{t("ajustesPlataformas.steamOficial.ayuda")}</p>
        </>
      )}
    </div>
  );

  const resultadoDeEpic = (resultadoEpic === "error" || resultadoEpic === "sincronizada") && (
    <p role="status" className={`mb-3 text-xs font-semibold ${resultadoEpic === "error" ? "text-red-400" : "text-green-500"}`}>
      {resultadoEpic === "error" ? `✕ ${t(`ajustesPlataformas.epicOficial.motivo.${motivoFallo}`)}` : `✓ ${t("ajustesPlataformas.epicExt.sincronizada")}`}
    </p>
  );

  // Los logros solo llegan con la extensión (Epic bloquea al servidor): el
  // paso que toca lo decide ExtensionEpic según esté instalada o no.
  const avisoEpic = (
    <div className="mb-4 rounded-xl border border-border bg-[var(--surface-2)] p-4">
      <p className="font-heading text-sm font-bold">{t("ajustesPlataformas.epicExt.titulo")}</p>
      {epic && !epicConLogros && <p className="mt-1 text-[0.8125rem] font-semibold text-[var(--gold)]">{t("ajustesPlataformas.epicExt.pendientes")}</p>}
      <div className="mt-3">
        <ExtensionEpic epicId={idParaPaginaDeLogros(epic?.accountId)} urlTienda={process.env.NEXT_PUBLIC_EXTENSION_STORE_URL?.trim() || null} />
      </div>
      <p className="mt-3 flex items-start gap-2 text-xs text-muted">
        <ShieldQuestion size={14} className="mt-0.5 shrink-0 text-[var(--gold)]" aria-hidden="true" />
        {tDeclarado("aviso")}
      </p>
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-heading text-2xl font-bold mb-2">{t("ajustesPlataformas.title")}</h1>
        <p className="text-sm text-muted">{t("ajustesPlataformas.description")}</p>
        <Link
          href="/vincular"
          className="mt-3 inline-block rounded-md px-1 text-[0.8125rem] font-bold text-[var(--accent-text)] hover:bg-[var(--accent-soft)] hover:underline"
        >
          {t("asistente.enlace")} →
        </Link>
      </div>

      <CompletarSteamSiHaceFalta userId={session.user.id} />

      <div className="cuentas-lista">
        <PlatformSection platform="psn" account={psn} t={t}>
          <LinkPsnForm current={psn?.username} sinAviso={psn?.isPublic === true} />
        </PlatformSection>

        <PlatformSection platform="steam" account={steam} t={t} verificada={steamConfirmada}>
          {verificarSteam}
          <LinkSteamForm current={steam?.username} sinAviso={steam?.isPublic === true} />
        </PlatformSection>

        {steamExtra && <CuentasSteamExtra cuentas={steamExtra} t={t} idioma={locale} />}

        <PlatformSection platform="xbox" account={xbox} t={t}>
          <LinkXboxForm current={xbox?.username} sinAviso={xbox?.isPublic === true} />
        </PlatformSection>

        <PlatformSection platform="epic" account={epic} t={t} verificada={epicConfirmada}>
          {resultadoDeEpic}
          {verificarEpic}
          {avisoEpic}
          <details className="group">
            <summary className="cursor-pointer rounded-md px-1 py-1 text-[0.8125rem] font-semibold text-muted hover:bg-[var(--surface-2)] hover:text-foreground">
              {t("ajustesPlataformas.epicExt.formulario")}
            </summary>
            <div className="mt-3">
              <LinkEpicForm current={epic?.username} sinAviso={epic?.isPublic === true} />
            </div>
          </details>
        </PlatformSection>

        {/* Google Play y Ubisoft Connect se quitaron del todo el 11 de
            septiembre de 2026 — ninguna llegó a tener sincronización real
            (ver docs/HANDOFF.md). Epic volvió el 22 de septiembre de 2026 con un
            enfoque distinto — ver lib/epic/client.ts. Nintendo no se puede
            vincular: una línea al final, sin ocupar una ficha entera. */}
        <div className="flex items-start gap-3 px-1 pt-1">
          <span className="cuenta-logo opacity-60" style={{ background: "linear-gradient(150deg, #E60012, #a8000d)" }}>
            <NintendoLogo className="h-5 w-5" />
          </span>
          <p className="text-[0.8125rem] text-muted">
            <span className="font-semibold text-foreground">{t("ajustesPlataformas.nintendo.title")}</span> · {t("ajustesPlataformas.nintendo.badge")}. {t("ajustesPlataformas.nintendo.description")}
          </p>
        </div>
      </div>

      <section className="ajustes-grupo">
        <h2 className="font-heading mb-1 text-[1.0625rem] font-bold tracking-[0.03em]">{t("ajustesPlataformas.collections.title")}</h2>
        <p className="mb-4 text-[0.8125rem] text-muted">
          {t("ajustesPlataformas.collections.description")}
        </p>
        <CollectionManager collections={carpetas} />
      </section>

      {(psn || steam || epic) && (
        <section className="ajustes-grupo">
          <h2 className="font-heading mb-4 text-[1.0625rem] font-bold tracking-[0.03em]">
            {t("ajustesPlataformas.sync.title")}
          </h2>

          <SyncNowForm />

          <div
            className="mt-4 flex gap-3 rounded-xl p-3.5"
            style={{ background: "rgba(226, 181, 62, 0.08)", border: "1px solid rgba(226, 181, 62, 0.22)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e2b53e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8h.01M11 12h1v4h1" />
            </svg>
            <p className="text-[0.8125rem] leading-relaxed" style={{ color: "#d8c48a" }}>
              {t("ajustesPlataformas.sync.steamNote")}
            </p>
          </div>
        </section>
      )}

      {salud.length > 0 && (
        <section className="ajustes-grupo">
          <h2 className="font-heading mb-1 text-[1.0625rem] font-bold tracking-[0.03em]">
            {t("ajustesPlataformas.health.title")}
          </h2>
          <p className="mb-4 text-[0.8125rem] text-muted">
            {t("ajustesPlataformas.health.description")}
          </p>

          <SaludSincronizacion filas={salud} />
        </section>
      )}

      {historial.length > 0 && (
        <section className="ajustes-grupo">
          <h2 className="font-heading mb-4 text-[1.0625rem] font-bold tracking-[0.03em]">{t("ajustesPlataformas.history.title")}</h2>
          <div className="space-y-2">
            {historial.map((run) => (
              <div key={run.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-xs">
                <span className="font-semibold">{PLATFORM_LABEL[run.platform as AccountPlatform] ?? run.platform}</span>
                <span className="text-muted">
                  {t("ajustesPlataformas.history.row", {
                    games: run.games,
                    newTrophies: run.newTrophies,
                    date: run.createdAt.toLocaleString(locale, { timeZone: tz }),
                  })}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
