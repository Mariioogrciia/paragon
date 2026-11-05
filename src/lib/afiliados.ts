/**
 * Enlaces de afiliado (5 nov 2026): con poco tráfico rinden más que los
 * anuncios (docs/HANDOFF.md). Cada tienda con programa propio tiene su
 * variable con tu código; sin ella, el enlace sale tal cual. Solo se toca
 * un enlace que va DIRECTO a la tienda: los de la redirección de CheapShark
 * no se pueden marcar (la URL final la decide CheapShark).
 *
 *   NEXT_PUBLIC_AFILIADO_HUMBLE        → ?partner=…   (Humble Partner Program)
 *   NEXT_PUBLIC_AFILIADO_FANATICAL     → ?ref=…       (Fanatical Affiliates)
 *   NEXT_PUBLIC_AFILIADO_GMG           → ?tap_a=…     (Green Man Gaming)
 *   NEXT_PUBLIC_AFILIADO_INSTANTGAMING → ?igr=…       (Instant Gaming)
 *   NEXT_PUBLIC_AFILIADO_GAMESPLANET   → ?ref=…       (Gamesplanet)
 *
 * Un enlace marcado lleva `rel="sponsored"` y la página avisa con
 * «Algunos enlaces son de afiliado» (lo pide la ley y las tiendas).
 * Módulo puro: `tests/afiliados.test.ts`.
 */

const TIENDAS: { hosts: string[]; parametro: string; variable: string }[] = [
  { hosts: ["humblebundle.com"], parametro: "partner", variable: "NEXT_PUBLIC_AFILIADO_HUMBLE" },
  { hosts: ["fanatical.com"], parametro: "ref", variable: "NEXT_PUBLIC_AFILIADO_FANATICAL" },
  { hosts: ["greenmangaming.com"], parametro: "tap_a", variable: "NEXT_PUBLIC_AFILIADO_GMG" },
  { hosts: ["instant-gaming.com"], parametro: "igr", variable: "NEXT_PUBLIC_AFILIADO_INSTANTGAMING" },
  { hosts: ["gamesplanet.com"], parametro: "ref", variable: "NEXT_PUBLIC_AFILIADO_GAMESPLANET" },
];

/** Las variables se leen una a una por nombre: en el cliente Next solo sustituye `process.env.X` literal. */
function codigos(): Record<string, string | undefined> {
  return {
    NEXT_PUBLIC_AFILIADO_HUMBLE: process.env.NEXT_PUBLIC_AFILIADO_HUMBLE,
    NEXT_PUBLIC_AFILIADO_FANATICAL: process.env.NEXT_PUBLIC_AFILIADO_FANATICAL,
    NEXT_PUBLIC_AFILIADO_GMG: process.env.NEXT_PUBLIC_AFILIADO_GMG,
    NEXT_PUBLIC_AFILIADO_INSTANTGAMING: process.env.NEXT_PUBLIC_AFILIADO_INSTANTGAMING,
    NEXT_PUBLIC_AFILIADO_GAMESPLANET: process.env.NEXT_PUBLIC_AFILIADO_GAMESPLANET,
  };
}

export interface EnlaceTienda {
  url: string;
  /** `true` si lleva código de afiliado: `rel="sponsored"` y aviso en la página. */
  afiliado: boolean;
}

export function enlaceAfiliado(url: string, codigosTienda: Record<string, string | undefined> = codigos()): EnlaceTienda {
  let destino: URL;
  try {
    destino = new URL(url);
  } catch {
    return { url, afiliado: false };
  }
  const host = destino.hostname.replace(/^www\./, "");
  const tienda = TIENDAS.find((t) => t.hosts.some((h) => host === h || host.endsWith(`.${h}`)));
  const codigo = tienda ? codigosTienda[tienda.variable]?.trim() : undefined;
  if (!tienda || !codigo) return { url, afiliado: false };
  destino.searchParams.set(tienda.parametro, codigo);
  return { url: destino.toString(), afiliado: true };
}

/** `rel` de un enlace a tienda: siempre sin referer ni seguimiento de SEO; `sponsored` si es de afiliado. */
export function relTienda(afiliado: boolean): string {
  return afiliado ? "noopener noreferrer nofollow sponsored" : "noopener noreferrer nofollow";
}
