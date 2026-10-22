"use client";

import { useMemo, type ReactNode } from "react";
import { NextIntlClientProvider, useLocale, useMessages, type AbstractIntlMessages } from "next-intl";
import { fusionarMensajes } from "@/i18n/clientMessages";

/**
 * Añade los textos de una sección a los que ya hay (los globales de la
 * raíz). Un NextIntlClientProvider anidado SUSTITUYE los mensajes del de
 * fuera, así que se fusionan aquí, en el navegador: así los globales no
 * viajan dos veces en el HTML. Ver components/TextosRuta.tsx.
 */
export function MasTextos({ mensajes, children }: { mensajes: AbstractIntlMessages; children: ReactNode }) {
  const base = useMessages();
  const locale = useLocale();
  const todos = useMemo(() => fusionarMensajes(base, mensajes), [base, mensajes]);
  return (
    <NextIntlClientProvider locale={locale} messages={todos}>
      {children}
    </NextIntlClientProvider>
  );
}
