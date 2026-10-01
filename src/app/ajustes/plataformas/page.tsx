import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldQuestion } from "lucide-react";
import { useLocale } from "next-intl";
import { auth } from "@/auth";
import { unlinkAccountAction } from "@/app/actions";
import { CollectionManager } from "@/components/Collections";
import { LinkPsnForm, LinkSteamForm, LinkXboxForm, LinkEpicForm, SyncNowForm, SyncPlatformForm } from "@/components/forms/Forms";
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

export const metadata = { title: "Ajustes · Paragon" };


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
}: {
  platform: PlataformaVinculable;
  account: PlatformAccount | null;
  t: Traductor;
  children: React.ReactNode;
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
                <p className="truncate text-[0.9375rem] font-semibold" title={account.username}>
                  {account.username}
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
                triggerClassName="rounded-md px-1 text-[0.8125rem] font-semibold text-muted transition-colors hover:bg-[var(--surface-2)] hover:text-danger"
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

export default async function AjustesPlataformasPage() {
  const session = await auth();
  if (!session?.user) redirect("/entrar");

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
  const tDeclarado = await getTranslations("Shell.Declarado");
  const locale = await getLocale();

  // Epic bloquea las lecturas desde el servidor (antibots): se sincroniza con
  // la extensión del navegador y el progreso es declarado (lib/declarado.ts).
  const avisoEpic = (
    <div className="mb-4 rounded-xl border border-border bg-[var(--surface-2)] p-4">
      <p className="font-heading text-sm font-bold">{t("ajustesPlataformas.epicExt.titulo")}</p>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-[0.8125rem] text-muted">
        <li>{t("ajustesPlataformas.epicExt.paso1")}</li>
        <li>{t("ajustesPlataformas.epicExt.paso2")}</li>
        <li>{t("ajustesPlataformas.epicExt.paso3")}</li>
      </ol>
      <Link href="/movil/enlazar-extension" className="mt-3 inline-block rounded-md px-1 text-[0.8125rem] font-bold text-[var(--accent-text)] hover:bg-[var(--accent-soft)] hover:underline">
        {t("ajustesPlataformas.epicExt.conectar")} →
      </Link>
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
      </div>

      <div className="cuentas-lista">
        <PlatformSection platform="psn" account={psn} t={t}>
          <LinkPsnForm current={psn?.username} sinAviso={psn?.isPublic === true} />
        </PlatformSection>

        <PlatformSection platform="steam" account={steam} t={t}>
          <LinkSteamForm current={steam?.username} sinAviso={steam?.isPublic === true} />
        </PlatformSection>

        <PlatformSection platform="xbox" account={xbox} t={t}>
          <LinkXboxForm current={xbox?.username} sinAviso={xbox?.isPublic === true} />
        </PlatformSection>

        <PlatformSection platform="epic" account={epic} t={t}>
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
            (ver HANDOFF.md). Epic volvió el 22 de septiembre de 2026 con un
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
