import React from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

const CARD = {
  border: "1px solid var(--border)",
  background: "linear-gradient(var(--surface), var(--background))",
};

interface Pregunta {
  q: string;
  a: React.ReactNode;
}

function Bloque({ titulo, preguntas }: { titulo: string; preguntas: Pregunta[] }) {
  return (
    <section className="mt-9">
      <h3 className="font-heading mb-4 text-xl font-bold">{titulo}</h3>

      <div className="space-y-2.5">
        {preguntas.map((p) => (
          <details key={p.q} className="group rounded-[18px] p-5" style={CARD}>
            <summary className="flex cursor-pointer items-center justify-between gap-4 text-[0.9375rem] font-semibold marker:content-['']">
              {p.q}
              <span
                className="shrink-0 text-muted transition-transform group-open:rotate-180"
                aria-hidden="true"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </summary>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">{p.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export async function FAQSection() {
  const t = await getTranslations("Shell.FAQ");

  const richTags = {
    strong: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
    em: (chunks: React.ReactNode) => <em>{chunks}</em>,
  };

  const GENERAL: Pregunta[] = [
    { q: t("general.q1"), a: t.rich("general.a1", richTags) },
    { q: t("general.q2"), a: t.rich("general.a2", richTags) },
    { q: t("general.q3"), a: t.rich("general.a3", richTags) },
  ];

  const PLATAFORMAS: Pregunta[] = [
    { q: t("plataformas.q1"), a: t.rich("plataformas.a1", richTags) },
    { q: t("plataformas.q2"), a: t.rich("plataformas.a2", richTags) },
    { q: t("plataformas.q3"), a: t.rich("plataformas.a3", richTags) },
    { q: t("plataformas.q4"), a: t.rich("plataformas.a4", richTags) },
  ];

  const BIBLIOTECA: Pregunta[] = [
    { q: t("biblioteca.q1"), a: t.rich("biblioteca.a1", richTags) },
    { q: t("biblioteca.q2"), a: t.rich("biblioteca.a2", richTags) },
    { q: t("biblioteca.q3"), a: t.rich("biblioteca.a3", richTags) },
    { q: t("biblioteca.q4"), a: t.rich("biblioteca.a4", richTags) },
  ];

  return (
    <div className="mx-auto max-w-[760px] py-16" id="faq">
      <div className="text-center mb-10">
        <h2 className="font-heading text-[2.625rem] font-bold uppercase leading-none">
          {t("heading")}
        </h2>
        <p className="mt-3 text-[0.9375rem] text-muted">
          {t("subheading")}
        </p>
      </div>

      <Bloque titulo={t("bloqueBasico")} preguntas={GENERAL} />
      <Bloque titulo={t("bloquePlataformas")} preguntas={PLATAFORMAS} />
      <Bloque titulo={t("bloqueBiblioteca")} preguntas={BIBLIOTECA} />

      <p className="mt-9 text-center text-[0.8125rem] text-muted">
        {t("footerPregunta")}{" "}
        <Link href="/ajustes" className="font-semibold text-accent hover:underline">
          {t("footerRevisarAjustes")}
        </Link>{" "}
        {t("footerOEscribenos")}
      </p>
    </div>
  );
}
