import React from "react";
import { metaPublica } from "@/lib/seo";
import Link from "next/link";
import { anunciosActivos } from "@/lib/publicidad";
import { GestionarConsentimiento } from "@/components/GestionarConsentimiento";
import { getTranslations } from "next-intl/server";
import { BackButton } from "@/components/BackButton";

export const metadata = metaPublica(
  "/cookies",
  "Política de cookies · Paragon",
  "Qué cookies y almacenamiento usa Paragon, para qué sirve cada uno y cuánto duran.",
);

export default async function CookiesPage() {
  const t = await getTranslations("Shell.Cookies");
  const tShell = await getTranslations("Shell.BackButton");
  const anuncios = anunciosActivos();

  const richTags = {
    strong: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
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

      <section className="space-y-3 text-sm leading-relaxed text-foreground/90">
        <h2 className="text-lg font-bold text-foreground">{t("s1t")}</h2>
        <p className="text-muted">{t.rich(anuncios ? "s1Anuncios" : "s1", richTags)}</p>
      </section>

      {anuncios && (
        <section className="space-y-3 text-sm leading-relaxed text-foreground/90">
          <h2 className="text-lg font-bold text-foreground">{t("sAnunciosT")}</h2>
          <p className="text-muted">
            {t.rich("sAnuncios", {
              googleLink: (chunks) => (
                <a
                  href="https://policies.google.com/technologies/partner-sites"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-accent hover:underline"
                >
                  {chunks}
                </a>
              ),
            })}
          </p>
          <GestionarConsentimiento className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-[var(--surface-2)]" />
        </section>
      )}

      <section className="space-y-3 text-sm leading-relaxed text-foreground/90">
        <h2 className="text-lg font-bold text-foreground">{t("s2t")}</h2>
        <p className="text-muted">{t("s2")}</p>
      </section>

      {/* Cada cookie con su nombre, para qué y cuánto dura (21 oct 2026): lo
          pide la guía de cookies de la AEPD. Si se añade una, va aquí. */}
      <section className="space-y-3 text-sm leading-relaxed text-foreground/90">
        <h2 className="text-lg font-bold text-foreground">{t("sListaT")}</h2>
        <p className="text-muted">{t("sListaIntro")}</p>
        <ul className="list-disc space-y-1.5 pl-5 text-muted">
          {(["sLista1", "sLista2", "sLista3", "sLista4"] as const).map((clave) => (
            <li key={clave}>
              {t.rich(clave, { c: (chunks) => <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">{chunks}</code> })}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 text-sm leading-relaxed text-foreground/90">
        <h2 className="text-lg font-bold text-foreground">{t("sTercerosT")}</h2>
        <p className="text-muted">{t("sTerceros")}</p>
      </section>

      <section className="space-y-3 text-sm leading-relaxed text-foreground/90">
        <h2 className="text-lg font-bold text-foreground">{t("s3t")}</h2>
        <p className="text-muted">
          {t.rich("s3", {
            localStorage: (chunks) => <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">{chunks}</code>,
          })}
        </p>
      </section>

      <section className="space-y-3 text-sm leading-relaxed text-foreground/90">
        <h2 className="text-lg font-bold text-foreground">{t("s4t")}</h2>
        <p className="text-muted">
          {t.rich("s4", {
            vercelLink: (chunks) => (
              <a
                href="https://vercel.com/docs/analytics/privacy-policy"
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-accent hover:underline"
              >
                {chunks}
              </a>
            ),
          })}
        </p>
      </section>

      <section className="space-y-3 text-sm leading-relaxed text-foreground/90">
        <h2 className="text-lg font-bold text-foreground">{t("s5t")}</h2>
        <p className="text-muted">{t("s5")}</p>
      </section>

      <section className="space-y-3 text-sm leading-relaxed text-foreground/90">
        <h2 className="text-lg font-bold text-foreground">{t("s6t")}</h2>
        <p className="text-muted">
          {t.rich("s6", {
            privacidadLink: (chunks) => <Link href="/privacidad" className="text-accent hover:underline">{chunks}</Link>,
            terminosLink: (chunks) => <Link href="/terminos" className="text-accent hover:underline">{chunks}</Link>,
          })}
        </p>
      </section>
    </div>
  );
}
