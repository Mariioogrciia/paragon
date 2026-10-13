import "server-only";
import { getLocale } from "next-intl/server";
import { esIdioma } from "@/lib/idiomasTrofeo";
import { traducirMensaje } from "@/lib/mensajesApi";

/**
 * Mensajes de las server actions en el idioma de la web (13 oct 2026).
 *
 * Los `{ error, warning, success }` que devuelven las acciones se escriben
 * en español por todo el código (y muchos vienen de librerías compartidas
 * con la API móvil). Se traducen al salir con la misma tabla que usa la app
 * (`lib/mensajesApi.ts`): lo que no esté ahí sale tal cual. Los códigos en
 * minúscula ("sesion", "limite"...) no pasan por aquí — el cliente los
 * convierte en su propio texto.
 */
export async function tr(texto: string): Promise<string> {
  const locale = await getLocale();
  return traducirMensaje(texto, esIdioma(locale) ? locale : "es");
}
