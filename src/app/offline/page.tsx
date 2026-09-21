"use client";

import { useTranslations } from "next-intl";
import { HunterGame } from "@/components/arcade/HunterGame";

export default function OfflinePage() {
  const t = useTranslations("Shell.Offline");
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 py-10">
      <div className="mb-6 rounded-full bg-accent/10 p-6">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m2 2 20 20" />
          <path d="M8.53 8.53C5.52 9.69 2.94 11.59 1 14c3 3.68 7.37 5.86 11 5.96" />
          <path d="M16.94 16.94c2.51-1.39 4.7-3.37 6.06-5.94C20.65 8.1 16.73 5.59 12 5.59c-1.38 0-2.69.25-3.92.7" />
        </svg>
      </div>
      <h1 className="font-heading text-3xl font-bold uppercase mb-2">{t("titulo")}</h1>
      <p className="text-muted max-w-md">
        {t("descripcion")}
      </p>
      <button
        onClick={() => typeof window !== 'undefined' && window.location.reload()}
        className="mt-8 rounded-lg px-6 py-2.5 font-bold text-background transition-all hover:-translate-y-0.5 hover:shadow-lg"
        style={{ background: "var(--accent-grad)" }}
      >
        {t("reintentar")}
      </button>

      {/* Mientras esperas: el easter egg de Paragon, mismo espíritu que el
          dinosaurio de Chrome — pero cazando trofeos, no saltando cactus. */}
      <HunterGame />
    </div>
  );
}
