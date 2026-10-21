import type React from "react";
import Link from "@/components/Enlace";
import { getTranslations } from "next-intl/server";
import { BackButton } from "@/components/BackButton";

export async function generateMetadata() {
  const t = await getTranslations("Shell.EliminarCuenta");
  return { title: `${t("title")} · Paragon` };
}

/**
 * Cómo eliminar la cuenta, sin necesidad de iniciar sesión (16 oct 2026): es
 * la URL que pide Google Play en la ficha ("Eliminación de datos"). Borrar
 * de verdad se hace en Ajustes → Seguridad (web) o en Ajustes (app).
 */
export default async function EliminarCuentaPage() {
  const t = await getTranslations("Shell.EliminarCuenta");
  const etiquetas = {
    ajustes: (chunks: React.ReactNode) => (
      <Link href="/ajustes/seguridad" className="text-accent hover:underline">
        {chunks}
      </Link>
    ),
    email: (chunks: React.ReactNode) => (
      <a href="mailto:mario.meca2005@gmail.com" className="text-accent hover:underline">
        {chunks}
      </a>
    ),
  };

  return (
    <div className="mx-auto max-w-[680px] space-y-6 py-4">
      <BackButton fallbackHref="/" />
      <h1 className="font-heading text-3xl font-bold">{t("title")}</h1>
      <p className="text-sm leading-relaxed text-muted">{t("intro")}</p>
      <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
        <li>{t.rich("web", etiquetas)}</li>
        <li>{t("app")}</li>
      </ul>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">{t("queTitulo")}</h2>
        <p className="text-sm leading-relaxed text-muted">{t("que")}</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">{t("sinAccesoTitulo")}</h2>
        <p className="text-sm leading-relaxed text-muted">{t.rich("sinAcceso", etiquetas)}</p>
      </section>
    </div>
  );
}
