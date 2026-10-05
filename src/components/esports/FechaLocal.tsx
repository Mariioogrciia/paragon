"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

const LOCALE_TAGS: Record<string, string> = { es: "es-ES", en: "en-US", de: "de-DE", fr: "fr-FR" };

/**
 * Fecha en la zona horaria de quien la ve (el servidor va en UTC: pintada
 * allí, un partido de las 18:00 en Madrid salía a las 16:00).
 */
export function FechaLocal({ iso, opciones, className }: { iso: string; opciones: Intl.DateTimeFormatOptions; className?: string }) {
  const locale = useLocale();
  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {new Date(iso).toLocaleString(LOCALE_TAGS[locale] ?? "es-ES", opciones)}
    </time>
  );
}

/** "Empieza en 2 h 15 min", al minuto. Desaparece cuando llega la hora. */
export function CuentaAtras({ iso }: { iso: string }) {
  const t = useTranslations("Descubrir.EsportsPartido");
  const [ahora, setAhora] = useState<number | null>(null);

  useEffect(() => {
    // Hora real solo en el cliente (el servidor no sabe cuándo se mira).
    const tic = () => setAhora(Date.now());
    const primero = setTimeout(tic, 0);
    const id = setInterval(tic, 30_000);
    return () => {
      clearTimeout(primero);
      clearInterval(id);
    };
  }, []);

  if (ahora === null) return null;
  const minutos = Math.round((new Date(iso).getTime() - ahora) / 60_000);
  if (minutos <= 0) return <span>{t("aPuntoDeEmpezar")}</span>;
  const dias = Math.floor(minutos / 1440);
  const horas = Math.floor((minutos % 1440) / 60);
  const mins = minutos % 60;
  return <span>{t("empiezaEn", { dias, horas, mins })}</span>;
}
