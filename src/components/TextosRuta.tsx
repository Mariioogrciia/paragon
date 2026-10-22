import type { ReactNode } from "react";
import { getMessages } from "next-intl/server";
import { elegirMensajes } from "@/i18n/clientMessages";
import { NAMESPACES_POR_RUTA } from "@/i18n/textosPorRuta";
import { MasTextos } from "@/components/MasTextos";

/**
 * Los textos que necesitan los componentes de cliente de una sección, solo
 * en esa sección (22 oct 2026). Va en el layout de cada carpeta de app/(app)
 * (y en las páginas de app/(publico)); `ruta` es la clave de
 * src/i18n/textosPorRuta.ts, que genera scripts/textos-por-ruta.mts.
 */
export async function TextosRuta({ ruta, children }: { ruta: string; children: ReactNode }) {
  const lista = NAMESPACES_POR_RUTA[ruta];
  if (!lista?.length) return children;
  return <MasTextos mensajes={elegirMensajes(await getMessages(), lista)}>{children}</MasTextos>;
}
