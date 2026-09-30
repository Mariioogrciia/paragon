import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { NAV_OCULTABLE, getHiddenNavItems } from "@/lib/navPreferences";
import { HiddenNavForm } from "@/components/forms/Forms";
import { PANEL_OCULTABLE, getPanelOculto } from "@/lib/panelPreferences";
import { setPanelOcultoAction } from "@/app/actions";
import { getTranslations } from "next-intl/server";

export const metadata = { title: "Ocultar · Ajustes · Paragon" };

export default async function AjustesOcultarPage() {
  const session = await auth();
  if (!session?.user) redirect("/entrar");

  const [ocultas, panelOculto] = await Promise.all([getHiddenNavItems(session.user.id), getPanelOculto(session.user.id)]);
  const t = await getTranslations("Onboarding");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold mb-2">{t("ajustesOcultar.title")}</h1>
        <p className="text-sm text-muted">
          {t("ajustesOcultar.description")}
        </p>
      </div>

      <HiddenNavForm opciones={NAV_OCULTABLE} ocultas={ocultas} />

      <div className="mt-4">
        <h2 className="text-lg font-bold mb-2">{t("ajustesOcultar.panelTitle")}</h2>
        <p className="text-sm text-muted">{t("ajustesOcultar.panelDescription")}</p>
      </div>
      <HiddenNavForm opciones={PANEL_OCULTABLE} ocultas={[...panelOculto]} action={setPanelOcultoAction} />
    </div>
  );
}
