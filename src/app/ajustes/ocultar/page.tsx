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

  // Las claves son la fuente de la verdad (navPreferences.ts/panelPreferences.ts);
  // el texto que se ve sale siempre de la traducción, no del `label` en español
  // que llevan esas constantes (ese solo sirve de comentario para quien lea el código).
  const navTraducido = NAV_OCULTABLE.map((n) => ({ key: n.key, label: t(`navOcultable.${n.key}`) }));
  const panelTraducido = PANEL_OCULTABLE.map((s) => ({ key: s.key, label: t(`panelOcultable.${s.key}`) }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold mb-2">{t("ajustesOcultar.title")}</h1>
        <p className="text-sm text-muted">
          {t("ajustesOcultar.description")}
        </p>
      </div>

      <section className="ajustes-grupo">
        <h2>{t("ajustesOcultar.navTitle")}</h2>
        <HiddenNavForm opciones={navTraducido} ocultas={ocultas} />
      </section>

      <section className="ajustes-grupo">
        <h2>{t("ajustesOcultar.panelTitle")}</h2>
        <p className="ajustes-ayuda">{t("ajustesOcultar.panelDescription")}</p>
        <HiddenNavForm opciones={panelTraducido} ocultas={[...panelOculto]} action={setPanelOcultoAction} />
      </section>
    </div>
  );
}
