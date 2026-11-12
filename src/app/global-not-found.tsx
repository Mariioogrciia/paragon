import RootLayout from "./(app)/layout";
import NoEncontrado from "./(app)/not-found";
import type { Metadata } from "next";
import { metadata as base } from "./documento";
export { viewport } from "./documento";

// La 404 no se indexa, pero sin metadataBase propio Next avisaba en cada una
// ("metadataBase … is not set", 12 nov 2026) y la imagen social salía con localhost.
export const metadata: Metadata = { ...base, robots: { index: false } };

/**
 * 404 de una dirección que no existe (21 oct 2026). Desde que hay dos raíces
 * (`(app)` y `(publico)`) no queda un layout común del que Next saque el 404,
 * así que se monta aquí con la raíz de siempre: misma cabecera, mismo pie y
 * el idioma de quien lo ve.
 */
export default function GlobalNotFound() {
  return (
    <RootLayout>
      <NoEncontrado />
    </RootLayout>
  );
}
