import type { ReactNode } from "react";
import { TextosRuta } from "@/components/TextosRuta";

/** Los textos de esta sección para el navegador (src/i18n/textosPorRuta.ts). */
export default function Layout({ children }: { children: ReactNode }) {
  return <TextosRuta ruta="/ritmo">{children}</TextosRuta>;
}
