import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { signOutAction, unlinkAccountAction } from "@/app/actions";
import { CollectionManager } from "@/components/Collections";
import { HandleForm, LinkPsnForm, LinkSteamForm, LinkXboxForm, ProfileSettingsForm, SyncNowForm, SyncPlatformForm } from "@/components/forms/Forms";
import { listCollections } from "@/lib/collections";
import { relativeDate } from "@/lib/design";
import { SaludSincronizacion } from "@/components/SaludSincronizacion";
import { saludSincronizacion } from "@/lib/syncHealth";
import { accountFor, getProfileByUserId, getUserTimezone } from "@/lib/profiles";
import { PLATFORM_LABEL, type AccountPlatform, type PlataformaVinculable, type PlatformAccount } from "@/lib/types";
import { getSyncHistory } from "@/lib/syncHistory";
import { PlayStationLogo, SteamLogo, XboxLogo, NintendoLogo } from "@/components/ui/PlatformLogos";
import { ConfirmForm } from "@/components/ui/ConfirmForm";
import { getTranslations } from "next-intl/server";

export const metadata = { title: "Ajustes · Paragon" };

const CARD = { border: "1px solid var(--border)", background: "linear-gradient(var(--surface), var(--background))" };

const AVATAR_BG: Record<PlataformaVinculable, string> = {
  psn: "linear-gradient(150deg, #2f7ad6, #6b3fd4)",
  steam: "linear-gradient(150deg, #2f7d9d, #1b2838)",
  xbox: "linear-gradient(150deg, #107C10, #16a316)",
};

type Traductor = Awaited<ReturnType<typeof getTranslations>>;

/** Ficha de una plataforma: vinculada o no, siempre con su formulario debajo. */
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
  const sincronizado = account?.syncedAt ? relativeDate(account.syncedAt) : null;

  return (
    <section className="mt-3.5 rounded-[18px] p-6 flex flex-col" style={CARD}>
      <div className="flex items-center gap-3 mb-4">
        <span
          className="font-heading flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-lg font-bold shadow-md text-white"
          style={{ background: AVATAR_BG[platform] }}
        >
          {platform === "psn" && <PlayStationLogo className="w-5 h-5" />}
          {platform === "steam" && <SteamLogo className="w-5 h-5" />}
          {platform === "xbox" && <XboxLogo className="w-5 h-5" />}
        </span>
        <h2 className="font-heading text-[1.0625rem] font-bold tracking-[0.03em]">
          {PLATFORM_LABEL[platform]}
        </h2>
      </div>

      {account && (
        <div
          className="mb-4 flex flex-col gap-3 rounded-[14px] p-4"
          style={{ border: "1px solid var(--border)", background: "var(--background)" }}
        >
          <div className="flex items-center gap-3">
            <span
              className="font-heading flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[12px] text-lg font-bold"
              style={{ background: AVATAR_BG[platform] }}
            >
              {account.username.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.9375rem] font-semibold" title={account.username}>
                {account.username}
              </p>
            </div>
            <span
              className="shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-[0.08em]"
              style={
                account.isPublic
                  ? { background: "rgba(78, 201, 138, 0.12)", border: "1px solid rgba(78, 201, 138, 0.3)", color: "#4ec98a" }
                  : { background: "rgba(226, 181, 62, 0.12)", border: "1px solid rgba(226, 181, 62, 0.3)", color: "#e2b53e" }
              }
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: account.isPublic ? "#4ec98a" : "#e2b53e" }}
              />
              {account.isPublic ? t("ajustesPlataformas.linked") : t("ajustesPlataformas.private")}
            </span>
          </div>

          <p className="text-xs text-muted leading-relaxed">
            {account.level !== null ? t("ajustesPlataformas.levelLabel", { level: account.level }) : t("ajustesPlataformas.accountLinked")}
            {sincronizado && t("ajustesPlataformas.syncedAt", { date: sincronizado })}
          </p>
          <SyncPlatformForm platform={platform} label={PLATFORM_LABEL[platform]} />
        </div>
      )}

      <div className="mt-auto pt-4">
        <label className="mb-2 block text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-muted">
          {account ? t("ajustesPlataformas.changeAccount") : t("ajustesPlataformas.linkAccount")}
        </label>
        {children}

        <p className="mt-2 text-xs text-muted">{t(`ajustesPlataformas.help.${platform}`)}</p>

        {account && (
          <div className="mt-4">
            <ConfirmForm
              action={unlinkAccountAction}
              hidden={{ platform }}
              title={t("ajustesPlataformas.confirmUnlink.title", { platform: PLATFORM_LABEL[platform] })}
              message={t("ajustesPlataformas.confirmUnlink.message")}
              confirmLabel={t("ajustesPlataformas.confirmUnlink.confirmLabel")}
              triggerClassName="text-[0.8125rem] font-semibold text-muted hover:text-danger"
            >
              {t("ajustesPlataformas.confirmUnlink.trigger", { platform: PLATFORM_LABEL[platform] })}
            </ConfirmForm>
          </div>
        )}
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
  const carpetas = await listCollections(session.user.id);
  // Las tres en paralelo: son independientes y el pool no se resiente por
  // tres consultas (ver el aviso de conexiones en db/index.ts).
  const [historial, salud, tz] = await Promise.all([
    getSyncHistory(session.user.id),
    saludSincronizacion(session.user.id),
    getUserTimezone(session.user.id),
  ]);

  const t = await getTranslations("Onboarding");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold mb-2">{t("ajustesPlataformas.title")}</h1>
        <p className="text-sm text-muted">{t("ajustesPlataformas.description")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <PlatformSection platform="psn" account={psn} t={t}>
          <LinkPsnForm current={psn?.username} />
        </PlatformSection>

        <PlatformSection platform="steam" account={steam} t={t}>
          <LinkSteamForm current={steam?.username} />
        </PlatformSection>

        <PlatformSection platform="xbox" account={xbox} t={t}>
          <LinkXboxForm current={xbox?.username} />
        </PlatformSection>

        {/* Google Play, Epic Games y Ubisoft Connect se quitaron del todo el
            11 de septiembre de 2026 — ninguna llegó a tener sincronización
            real (ver HANDOFF.md), y las pocas cuentas que se habían llegado
            a vincular no guardaban ningún dato sincronizado de verdad. */}
        <section className="mt-3.5 rounded-[18px] p-6 flex flex-col" style={CARD}>
          <div className="flex items-center gap-3 mb-4 opacity-50">
            <span
              className="font-heading flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] shadow-md text-white"
              style={{ background: "linear-gradient(150deg, #E60012, #a8000d)" }}
            >
              <NintendoLogo className="w-5 h-5" />
            </span>
            <h2 className="font-heading text-[1.0625rem] font-bold tracking-[0.03em]">{t("ajustesPlataformas.nintendo.title")}</h2>
          </div>
          <div className="mt-auto pt-4 border-t border-white/5">
            <p className="text-xs text-muted mb-2 font-semibold text-danger">{t("ajustesPlataformas.nintendo.badge")}</p>
            <p className="text-xs text-muted">
              {t("ajustesPlataformas.nintendo.description")}
            </p>
          </div>
        </section>
      </div>

      <section className="mt-3.5 rounded-[18px] p-6" style={CARD}>
        <h2 className="font-heading mb-1 text-[1.0625rem] font-bold tracking-[0.03em]">{t("ajustesPlataformas.collections.title")}</h2>
        <p className="mb-4 text-[0.8125rem] text-muted">
          {t("ajustesPlataformas.collections.description")}
        </p>
        <CollectionManager collections={carpetas} />
      </section>

      {(psn || steam) && (
        <section className="mt-3.5 rounded-[18px] p-6" style={CARD}>
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
        <section className="mt-3.5 rounded-[18px] p-6" style={CARD}>
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
        <section className="rounded-[18px] p-6" style={CARD}>
          <h2 className="font-heading mb-4 text-[1.0625rem] font-bold tracking-[0.03em]">{t("ajustesPlataformas.history.title")}</h2>
          <div className="space-y-2">
            {historial.map((run) => (
              <div key={run.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-xs">
                <span className="font-semibold">{PLATFORM_LABEL[run.platform as AccountPlatform] ?? run.platform}</span>
                <span className="text-muted">
                  {t("ajustesPlataformas.history.row", {
                    games: run.games,
                    newTrophies: run.newTrophies,
                    date: run.createdAt.toLocaleString("es-ES", { timeZone: tz }),
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
