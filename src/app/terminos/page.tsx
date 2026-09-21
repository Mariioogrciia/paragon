import React from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BackButton } from "@/components/BackButton";

export const metadata = { title: "Términos y Condiciones · Paragon" };

function Seccion({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 text-sm leading-relaxed text-foreground/90">
      <h2 className="text-lg font-bold text-foreground">
        {num}. {title}
      </h2>
      {children}
    </section>
  );
}

export default async function TerminosPage() {
  const t = await getTranslations("Shell.Terminos");
  const tShell = await getTranslations("Shell.BackButton");

  const richTags = {
    strong: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
    em: (chunks: React.ReactNode) => <em>{chunks}</em>,
  };

  return (
    <div className="mx-auto max-w-3xl py-12 px-4 space-y-8">
      <BackButton fallbackHref="/" label={tShell("volverAlInicio")} />

      <div className="space-y-4">
        <h1 className="font-heading text-4xl font-bold uppercase tracking-wide">
          {t("titulo")}
        </h1>
        <p className="text-sm text-muted">{t("ultimaActualizacion")}</p>
      </div>

      <Seccion num="1" title={t("s1t")}>
        <p className="text-muted">{t.rich("s1", richTags)}</p>
      </Seccion>

      <Seccion num="2" title={t("s2t")}>
        <p className="text-muted">{t("s2")}</p>
      </Seccion>

      <Seccion num="3" title={t("s3t")}>
        <p className="text-muted">{t.rich("s3", richTags)}</p>
      </Seccion>

      <Seccion num="4" title={t("s4t")}>
        <p className="text-muted">{t("s4")}</p>
      </Seccion>

      <Seccion num="5" title={t("s5t")}>
        <p className="text-muted">{t("s5")}</p>
      </Seccion>

      <Seccion num="6" title={t("s6t")}>
        <p className="text-muted">{t("s6")}</p>
      </Seccion>

      <Seccion num="7" title={t("s7t")}>
        <p className="text-muted">{t("s7")}</p>
      </Seccion>

      <Seccion num="8" title={t("s8t")}>
        <p className="text-muted">{t("s8")}</p>
      </Seccion>

      <Seccion num="9" title={t("s9t")}>
        <p className="text-muted">
          {t.rich("s9", {
            email: (chunks) => (
              <a href="mailto:mario.meca2005@gmail.com" className="text-accent hover:underline">
                {chunks}
              </a>
            ),
            privacidadLink: (chunks) => <Link href="/privacidad" className="text-accent hover:underline">{chunks}</Link>,
            cookiesLink: (chunks) => <Link href="/cookies" className="text-accent hover:underline">{chunks}</Link>,
          })}
        </p>
      </Seccion>
    </div>
  );
}
