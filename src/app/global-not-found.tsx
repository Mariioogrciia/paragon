import RootLayout from "./(app)/layout";
import NoEncontrado from "./(app)/not-found";
export { metadata, viewport } from "./documento";

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
