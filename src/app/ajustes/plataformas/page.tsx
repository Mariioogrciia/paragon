import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { signOutAction, syncNowAction, syncPlatformAction, unlinkAccountAction } from "@/app/actions";
import { CollectionManager } from "@/components/Collections";
import { HandleForm, LinkPsnForm, LinkSteamForm, LinkGoogleForm, LinkXboxForm, LinkEpicForm, LinkUbisoftForm, ProfileSettingsForm } from "@/components/forms/Forms";
import { listCollections } from "@/lib/collections";
import { relativeDate } from "@/lib/design";
import { accountFor, getProfileByUserId } from "@/lib/profiles";
import { PLATFORM_LABEL, type AccountPlatform, type PlatformAccount } from "@/lib/types";
import { getSyncHistory } from "@/lib/syncHistory";
import {
  PlayStationLogo,
  SteamLogo,
  GooglePlayLogo,
  XboxLogo,
  EpicGamesLogo,
  UbisoftLogo,
  NintendoLogo,
} from "@/components/ui/PlatformLogos";

export const metadata = { title: "Ajustes · Paragon" };

const CARD = { border: "1px solid var(--border)", background: "linear-gradient(var(--surface), var(--background))" };

const AVATAR_BG: Record<AccountPlatform, string> = {
  psn: "linear-gradient(150deg, #2f7ad6, #6b3fd4)",
  steam: "linear-gradient(150deg, #2f7d9d, #1b2838)",
  google: "linear-gradient(150deg, #34A853, #4285F4)",
  xbox: "linear-gradient(150deg, #107C10, #16a316)",
  epic: "linear-gradient(150deg, #313131, #000000)",
  ubisoft: "linear-gradient(150deg, #0070FF, #004ecc)",
};

const HELP: Record<AccountPlatform, string> = {
  psn:
    "Tu ID público de PlayStation, el nombre con el que juegas. Tu perfil de " +
    "trofeos tiene que estar en público para que podamos leerlo.",
  steam:
    "Tu usuario de Steam, tu SteamID64 o la URL de tu perfil. En Steam, «Mi " +
    "perfil» y «Detalles del juego» tienen que estar en público.",
  google:
    "Tu cuenta de Google Play Games. Se sincronizan los logros de los juegos compatibles con la plataforma móvil.",
  xbox:
    "Tu Gamertag de Xbox. Sincroniza de verdad tu historial de logros, vía un " +
    "servicio de terceros (no oficial de Microsoft) — puede fallar o dejar de " +
    "funcionar si ese servicio cambia.",
  epic:
    "Tu cuenta de Epic Games. Conecta directamente con los servicios oficiales (Epic Account Services).",
  ubisoft:
    "Tu usuario de Ubisoft Connect. Se requiere tener la privacidad del perfil público (en fase de desarrollo).",
};

/** Ficha de una plataforma: vinculada o no, siempre con su formulario debajo. */
function PlatformSection({
  platform,
  account,
  children,
}: {
  platform: AccountPlatform;
  account: PlatformAccount | null;
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
          {platform === "google" && <GooglePlayLogo className="w-5 h-5" />}
          {platform === "xbox" && <XboxLogo className="w-5 h-5" />}
          {platform === "epic" && <EpicGamesLogo className="w-5 h-5" />}
          {platform === "ubisoft" && <UbisoftLogo className="w-5 h-5" />}
        </span>
        <h2 className="font-heading text-[17px] font-bold tracking-[0.03em]">
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
              <p className="truncate text-[15px] font-semibold" title={account.username}>
                {account.username}
              </p>
            </div>
            <span
              className="shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em]"
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
              {account.isPublic ? "Vinculado" : "Privado"}
            </span>
          </div>

          <p className="text-xs text-muted leading-relaxed">
            {account.level !== null ? `Nivel ${account.level}` : "Cuenta vinculada"}
            {sincronizado && ` · sincronizado ${sincronizado}`}
          </p>
          <form action={syncPlatformAction} className="mt-2">
            <input type="hidden" name="platform" value={platform} />
            <button className="text-xs font-semibold text-accent hover:underline">Sincronizar {PLATFORM_LABEL[platform]}</button>
          </form>
        </div>
      )}

      <div className="mt-auto pt-4">
        <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
          {account ? "Cambiar cuenta" : "Vincular cuenta"}
        </label>
        {children}

        <p className="mt-2 text-xs text-muted">{HELP[platform]}</p>

        {account && (
          <form action={unlinkAccountAction} className="mt-4">
            <input type="hidden" name="platform" value={platform} />
            <button className="text-[13px] font-semibold text-muted hover:text-danger">
              Desvincular {PLATFORM_LABEL[platform]}
            </button>
          </form>
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
  const google = accountFor(profile, "google");
  const xbox = accountFor(profile, "xbox");
  const epic = accountFor(profile, "epic");
  const ubisoft = accountFor(profile, "ubisoft");
  const carpetas = await listCollections(session.user.id);
  const historial = await getSyncHistory(session.user.id);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold mb-2">Cuentas de Juegos</h1>
        <p className="text-sm text-muted">Vincula tus plataformas para sincronizar tus trofeos automáticamente.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <PlatformSection platform="psn" account={psn}>
          <LinkPsnForm current={psn?.username} />
        </PlatformSection>

        <PlatformSection platform="steam" account={steam}>
          <LinkSteamForm current={steam?.username} />
        </PlatformSection>
        
        <PlatformSection platform="google" account={google}>
          <LinkGoogleForm current={google?.username} />
        </PlatformSection>

        <PlatformSection platform="xbox" account={xbox}>
          <LinkXboxForm current={xbox?.username} />
        </PlatformSection>

        <PlatformSection platform="epic" account={epic}>
          <LinkEpicForm current={epic?.username} />
        </PlatformSection>
        
        <PlatformSection platform="ubisoft" account={ubisoft}>
          <LinkUbisoftForm current={ubisoft?.username} />
        </PlatformSection>

        <section className="mt-3.5 rounded-[18px] p-6 flex flex-col" style={CARD}>
          <div className="flex items-center gap-3 mb-4 opacity-50">
            <span
              className="font-heading flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] shadow-md text-white"
              style={{ background: "linear-gradient(150deg, #E60012, #a8000d)" }}
            >
              <NintendoLogo className="w-5 h-5" />
            </span>
            <h2 className="font-heading text-[17px] font-bold tracking-[0.03em]">Nintendo Switch</h2>
          </div>
          <div className="mt-auto pt-4 border-t border-white/5">
            <p className="text-xs text-muted mb-2 font-semibold text-danger">Ecosistema cerrado</p>
            <p className="text-xs text-muted">
              Nintendo Switch no tiene sistema de trofeos propio ni API de actividad jugable.
            </p>
          </div>
        </section>
      </div>

      <section className="mt-3.5 rounded-[18px] p-6" style={CARD}>
        <h2 className="font-heading mb-1 text-[17px] font-bold tracking-[0.03em]">Carpetas</h2>
        <p className="mb-4 text-[13px] text-muted">
          Tus agrupaciones a mano. Se crean y se rellenan desde la ficha de cada
          juego; aquí solo se repasan y se borran.
        </p>
        <CollectionManager collections={carpetas} />
      </section>

      {(psn || steam) && (
        <section className="mt-3.5 rounded-[18px] p-6" style={CARD}>
          <h2 className="font-heading mb-4 text-[17px] font-bold tracking-[0.03em]">
            Sincronización
          </h2>

          <form action={syncNowAction}>
            <button
              className="rounded-[10px] px-4 py-2.5 text-[13px] font-bold text-background transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-6px_rgba(88,167,255,0.4)] active:translate-y-0 active:scale-95"
              style={{ background: "var(--accent-grad)" }}
            >
              Sincronizar ahora
            </button>
          </form>

          <div
            className="mt-4 flex gap-3 rounded-xl p-3.5"
            style={{ background: "rgba(226, 181, 62, 0.08)", border: "1px solid rgba(226, 181, 62, 0.22)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e2b53e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8h.01M11 12h1v4h1" />
            </svg>
            <p className="text-[13px] leading-relaxed" style={{ color: "#d8c48a" }}>
              Steam no da el porcentaje de logros en la lista de juegos: se
              calcula juego a juego. Al sincronizar se traen los más recientes y
              el resto se completa solo la primera vez que abres su ficha.
            </p>
          </div>
        </section>
      )}

      {historial.length > 0 && (
        <section className="rounded-[18px] p-6" style={CARD}>
          <h2 className="font-heading mb-4 text-[17px] font-bold tracking-[0.03em]">Historial de sincronización</h2>
          <div className="space-y-2">
            {historial.map((run) => (
              <div key={run.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-xs">
                <span className="font-semibold">{PLATFORM_LABEL[run.platform as AccountPlatform] ?? run.platform}</span>
                <span className="text-muted">{run.games} juegos · {run.newTrophies} trofeos nuevos · {run.createdAt.toLocaleString("es-ES")}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
