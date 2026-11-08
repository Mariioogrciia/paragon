import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { NAV_OCULTABLE, getHiddenNavItems } from "@/lib/navPreferences";
import { HiddenNavForm } from "@/components/forms/Forms";
import { PANEL_OCULTABLE, getPanelOculto } from "@/lib/panelPreferences";
import { setPanelOcultoAction } from "@/app/actions";
import { getTranslations } from "next-intl/server";
import { getLibrary, getProfileByUserId } from "@/lib/profiles";
import { getRetirados } from "@/lib/retirados";
import { dispositivosDeBiblioteca } from "@/lib/retiradosReglas";
import { RetiradosForm } from "@/components/RetiradosForm";

export const metadata = { title: "Ocultar · Ajustes · Paragon" };

export default async function AjustesOcultarPage() {
  const session = await auth();
  if (!session?.user) redirect("/entrar");

  const [ocultas, panelOculto, perfil, retirados] = await Promise.all([
    getHiddenNavItems(session.user.id),
    getPanelOculto(session.user.id),
    getProfileByUserId(session.user.id),
    getRetirados(session.user.id),
  ]);
  // Lo que ya no tienes (8 nov 2026, lib/retirados.ts): las consolas salen de tu biblioteca.
  const games = perfil ? (await getLibrary(perfil)).games : [];
  const consolas = dispositivosDeBiblioteca(games).map((c) => ({ ...c, retirado: retirados.dispositivos.has(c.dispositivo) }));
  const juegosOcultos = games.filter((g) => retirados.juegos.has(g.id)).map((g) => ({ id: g.id, titulo: g.title }));
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

      {consolas.length > 0 && (
        <section className="ajustes-grupo">
          <h2>{t("ajustesOcultar.retiradosTitle")}</h2>
          <p className="ajustes-ayuda">{t("ajustesOcultar.retiradosDescription")}</p>
          <RetiradosForm
            consolas={consolas}
            juegos={juegosOcultos}
            textos={{
              consolas: t("ajustesOcultar.retiradosConsolas"),
              juegos: t("ajustesOcultar.retiradosJuegos"),
              volverAMostrar: t("ajustesOcultar.retiradosVolver"),
              ningunJuego: t("ajustesOcultar.retiradosNinguno"),
              nJuego: t("ajustesOcultar.retiradosNJuego", { n: "{n}" }),
              nJuegos: t("ajustesOcultar.retiradosNJuegos", { n: "{n}" }),
            }}
          />
        </section>
      )}

      <section className="ajustes-grupo">
        <h2>{t("ajustesOcultar.panelTitle")}</h2>
        <p className="ajustes-ayuda">{t("ajustesOcultar.panelDescription")}</p>
        <HiddenNavForm opciones={panelTraducido} ocultas={[...panelOculto]} action={setPanelOcultoAction} />
      </section>
    </div>
  );
}
