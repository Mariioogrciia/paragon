import type { AbstractIntlMessages } from "next-intl";
import { NAMESPACES_GLOBALES } from "@/i18n/textosPorRuta";

/**
 * Qué parte de los mensajes viaja al navegador.
 *
 * Historia: hasta el 28 sept 2026 iban TODOS (~110 KB) en el HTML de cada
 * página; luego solo los que usaba algún componente de cliente (~83 KB,
 * seguían yendo a todas). Desde el 22 oct 2026 van por secciones:
 * `scripts/textos-por-ruta.mts` sigue los imports de cada ruta y genera
 * `textosPorRuta.ts` con los globales (cabecera, pie...: ~2 KB, en
 * documento.tsx) y los de cada sección (los añade su layout con
 * <TextosRuta>). La CI comprueba que el archivo generado esté al día.
 */

/** Solo las rutas de la lista ("Ns" o "Ns.parte.sub"), respetando el anidado. */
export function elegirMensajes(mensajes: AbstractIntlMessages, lista: readonly string[]): AbstractIntlMessages {
  const resultado: AbstractIntlMessages = {};
  for (const ruta of lista) {
    const partes = ruta.split(".");
    let origen: AbstractIntlMessages | string | undefined = mensajes;
    for (const parte of partes) origen = typeof origen === "object" ? origen[parte] : undefined;
    if (origen === undefined) continue;

    let destino = resultado;
    for (const parte of partes.slice(0, -1)) {
      const siguiente = destino[parte];
      destino = (typeof siguiente === "object" ? siguiente : (destino[parte] = {})) as AbstractIntlMessages;
    }
    destino[partes[partes.length - 1]] = origen;
  }
  return resultado;
}

/** Los de todas las páginas (el proveedor de documento.tsx). */
export function mensajesCliente(mensajes: AbstractIntlMessages): AbstractIntlMessages {
  return elegirMensajes(mensajes, NAMESPACES_GLOBALES);
}

/** `a` con lo de `b` encima, en profundidad (sin tocar ninguno de los dos). */
export function fusionarMensajes(a: AbstractIntlMessages, b: AbstractIntlMessages): AbstractIntlMessages {
  const res: AbstractIntlMessages = { ...a };
  for (const [clave, valor] of Object.entries(b)) {
    const previo = res[clave];
    res[clave] =
      typeof valor === "object" && typeof previo === "object"
        ? fusionarMensajes(previo as AbstractIntlMessages, valor as AbstractIntlMessages)
        : valor;
  }
  return res;
}
