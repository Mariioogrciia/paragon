import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { getDb } from "@/db";
import { users, accounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { signOutAction, unlinkAuthAccountAction, deleteAccountAction } from "@/app/actions";
import { getTranslations } from "next-intl/server";
import { ConfirmForm } from "@/components/ui/ConfirmForm";
import { GoogleLogo, DiscordLogo } from "@/components/ui/PlatformLogos";

const NOMBRE_PROVEEDOR: Record<string, string> = { google: "Google", discord: "Discord" };

export default async function AjustesSeguridadPage({
  searchParams,
}: {
  searchParams: Promise<{ vinculado?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/entrar");

  const { vinculado, error } = await searchParams;

  const db = getDb();
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!dbUser) redirect("/entrar");

  const userAccounts = await db.query.accounts.findMany({
    where: eq(accounts.userId, session.user.id),
  });

  // Solo se ofrece vincular lo que de verdad está configurado en el
  // servidor (mismo criterio que auth.ts al dar de alta los proveedores) y
  // que esta cuenta todavía no tiene — un botón para un proveedor sin
  // configurar revienta al pulsarlo, no "casi funciona".
  const yaVinculados = new Set(userAccounts.map((a) => a.provider));
  const disponibles = [
    { id: "google" as const, configurado: Boolean(process.env.AUTH_GOOGLE_ID) },
    { id: "discord" as const, configurado: Boolean(process.env.AUTH_DISCORD_ID) },
  ].filter((p) => p.configurado && !yaVinculados.has(p.id));

  const t = await getTranslations("Onboarding");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold mb-2">{t("ajustesSeguridad.title")}</h1>
        <p className="text-sm text-muted">{t("ajustesSeguridad.description")}</p>
      </div>

      {vinculado === "1" && (
        <p
          className="rounded-[14px] px-[18px] py-4 text-[0.8125rem] leading-relaxed"
          style={{ border: "1px solid rgba(52, 168, 83, 0.35)", background: "rgba(52, 168, 83, 0.08)", color: "#86efac" }}
        >
          {t("ajustesSeguridad.linkedBanner")}
        </p>
      )}
      {error === "cuenta-ya-vinculada" && (
        <p
          className="rounded-[14px] px-[18px] py-4 text-[0.8125rem] leading-relaxed"
          style={{ border: "1px solid rgba(248, 113, 113, 0.35)", background: "rgba(248, 113, 113, 0.08)", color: "#fca5a5" }}
        >
          {t("ajustesSeguridad.alreadyLinkedBanner")}
        </p>
      )}

      <section className="rounded-[18px] p-6 border border-white/10 bg-surface-2/30">
        <h2 className="font-semibold mb-4">{t("ajustesSeguridad.linkedAccounts.title")}</h2>
        <div className="flex flex-col gap-4">
          {userAccounts.map((acc) => (
            <div key={acc.provider} className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface)] border border-white/5">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-md"
                  style={{ background: acc.provider === "google" ? "#ea4335" : acc.provider === "discord" ? "#5865F2" : "var(--surface-2)" }}
                >
                  {acc.provider === "google" && <GoogleLogo className="w-4 h-4" />}
                  {acc.provider === "discord" && <DiscordLogo className="w-5 h-5" />}
                  {acc.provider !== "google" && acc.provider !== "discord" && acc.provider[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium capitalize">{acc.provider}</p>
                  <p className="text-xs text-muted">{dbUser.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[0.6875rem] font-semibold text-good uppercase tracking-wider bg-good/10 px-3 py-1 rounded-full border border-good/20">
                  {t("ajustesSeguridad.linkedAccounts.linked")}
                </span>
                {userAccounts.length > 1 && (
                  <ConfirmForm
                    action={unlinkAuthAccountAction}
                    hidden={{ provider: acc.provider }}
                    title={t("ajustesSeguridad.confirmUnlink.title", { provider: NOMBRE_PROVEEDOR[acc.provider] ?? acc.provider })}
                    message={t("ajustesSeguridad.confirmUnlink.message")}
                    confirmLabel={t("ajustesSeguridad.confirmUnlink.confirmLabel")}
                    triggerClassName="text-xs font-semibold text-muted hover:text-danger transition-colors"
                  >
                    Desvincular
                  </ConfirmForm>
                )}
              </div>
            </div>
          ))}
        </div>

        {disponibles.length > 0 && (
          <div className="mt-5 flex flex-col gap-3 border-t border-white/5 pt-5">
            <p className="text-xs text-muted">
              {t("ajustesSeguridad.linkedAccounts.hint")}
            </p>
            {disponibles.map((p) => (
              <form
                key={p.id}
                action={async () => {
                  "use server";
                  await signIn(p.id, { redirectTo: "/ajustes/seguridad" });
                }}
              >
                <button
                  type="submit"
                  className="flex w-full items-center justify-between gap-3 rounded-xl p-4 text-left font-medium transition-all hover:border-accent hover:bg-surface-2"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  <span className="flex items-center gap-3">
                    <span 
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-md"
                      style={{ background: p.id === "google" ? "#ea4335" : p.id === "discord" ? "#5865F2" : "var(--surface-2)" }}
                    >
                      {p.id === "google" && <GoogleLogo className="w-4 h-4" />}
                      {p.id === "discord" && <DiscordLogo className="w-5 h-5" />}
                    </span>
                    {t("ajustesSeguridad.linkedAccounts.linkWith", { provider: NOMBRE_PROVEEDOR[p.id] })}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-accent">{t("ajustesSeguridad.linkedAccounts.linkAction")}</span>
                </button>
              </form>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[18px] p-6 border border-white/10 bg-surface-2/30">
        <h2 className="font-semibold mb-4">{t("ajustesSeguridad.export.title")}</h2>
        <p className="text-sm text-muted mb-6">
          {t("ajustesSeguridad.export.description")}
        </p>
        <a
          href="/api/exportar"
          download
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:text-[var(--accent-text)] px-6 py-2.5 font-semibold transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
          {t("ajustesSeguridad.export.button")}
        </a>
      </section>

      <section className="rounded-[18px] p-6 border border-danger/30 bg-danger/5">
        <h2 className="font-semibold mb-4 text-danger">{t("ajustesSeguridad.signOut.title")}</h2>
        <p className="text-sm text-muted mb-6">{t("ajustesSeguridad.signOut.description")}</p>

        <div className="flex flex-col sm:flex-row gap-4">
          <ConfirmForm
            action={signOutAction}
            title="¿Cerrar sesión?"
            message="Tendrás que volver a identificarte la próxima vez que entres a Paragon."
            confirmLabel={t("ajustesSeguridad.signOut.button")}
            triggerClassName="rounded-xl border border-danger/50 text-danger hover:bg-danger hover:text-white px-6 py-2.5 font-semibold transition-all inline-block"
          >
            {t("ajustesSeguridad.signOut.button")}
          </ConfirmForm>

          <ConfirmForm
            action={deleteAccountAction}
            title="¿Eliminar cuenta definitivamente?"
            message="Esta acción es IRREVERSIBLE. Se borrarán todos tus datos, perfiles, colecciones y progreso. Tu cuenta no se podrá recuperar."
            confirmLabel="Eliminar cuenta"
            triggerClassName="rounded-xl bg-danger text-white px-6 py-2.5 font-semibold transition-all inline-block hover:opacity-90"
          >
            Eliminar cuenta
          </ConfirmForm>
        </div>
      </section>
    </div>
  );
}
