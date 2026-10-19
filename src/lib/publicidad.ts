/**
 * Publicidad (19 oct 2026): Google AdSense con el banner de consentimiento
 * certificado de Google ("Privacidad y mensajes", un CMP con IAB TCF v2.2,
 * que es el que AdSense exige en el Espacio Económico Europeo y Reino
 * Unido). Todo apagado hasta que exista `NEXT_PUBLIC_ADSENSE_CLIENT`
 * (`ca-pub-…`, de AdSense → Cuenta → Información de la cuenta): sin ella no
 * se carga ningún script de Google, no hay `ads.txt` y las páginas de
 * privacidad y cookies siguen diciendo que no hay anuncios.
 *
 * - `NEXT_PUBLIC_ADSENSE_CLIENT`: el ID de editor. Con él se cargan el
 *   mensaje de consentimiento y AdSense, y sale `/ads.txt`.
 * - `NEXT_PUBLIC_ADSENSE_SLOT` (opcional): un bloque de anuncios "display"
 *   para los huecos fijos (components/HuecoAnuncio.tsx). Sin él, solo los
 *   anuncios automáticos, si se activan en AdSense.
 *
 * El banner en sí (textos, botones, idiomas) se configura en AdSense →
 * Privacidad y mensajes → "Reglamentos europeos" y se publica desde allí;
 * aquí solo se carga su etiqueta. Ver la guía en HANDOFF.md.
 *
 * Son `NEXT_PUBLIC_` porque las lee también el navegador (el hueco de cada
 * anuncio); no son secretos: el ID de editor sale en el HTML de cualquier
 * web con AdSense.
 */

const CLIENTE_RE = /^ca-pub-\d{10,20}$/;
const SLOT_RE = /^\d{6,20}$/;

/** `ca-pub-…` válido, o null (apagado). */
export function clienteAdSense(valor = process.env.NEXT_PUBLIC_ADSENSE_CLIENT): string | null {
  const limpio = valor?.trim();
  return limpio && CLIENTE_RE.test(limpio) ? limpio : null;
}

/** El bloque para los huecos fijos, o null si no hay (o no es un número). */
export function slotAdSense(valor = process.env.NEXT_PUBLIC_ADSENSE_SLOT): string | null {
  const limpio = valor?.trim();
  return limpio && SLOT_RE.test(limpio) ? limpio : null;
}

export function anunciosActivos(): boolean {
  return clienteAdSense() !== null;
}

/**
 * La línea de `ads.txt` que pide AdSense: `pub-…` sin el `ca-`, y el ID fijo
 * de Google como sistema de anuncios (f08c47fec0942fa0).
 */
export function lineaAdsTxt(cliente: string): string {
  return `google.com, ${cliente.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0\n`;
}

/** La etiqueta del mensaje de consentimiento de Google (Privacidad y mensajes). */
export function urlMensajeConsentimiento(cliente: string): string {
  return `https://fundingchoicesmessages.google.com/i/${cliente.replace(/^ca-/, "")}?ers=1`;
}

export function urlAdSense(cliente: string): string {
  return `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${cliente}`;
}
